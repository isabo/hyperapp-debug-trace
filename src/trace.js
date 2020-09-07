import { generateMiddleware, getFunctionName } from './intercept';

export const traceDispatch = generateMiddleware({
  preAction,
  postAction,
  preEffect,
  postEffect,
});

/**
 * Logs the arguments provided to the action that is about to be dispatched.
 *
 * @param {string} name of the action function
 * @param {*} state
 * @param {*} props
 */
function preAction(name, state, props) {
  // Create a logging group that will include both pre- and post-action logs.
  console.group('Action: ' + name);

  console.group('Called with:');
  console.log('State:', state);
  console.log('Props:', props);
  console.groupEnd();
}

/**
 * Logs the return value of the action that has just completed.
 *
 * @param {string} name of the action function.
 * @param {*} state the state that was provided to the action.
 * @param {*} props
 */
function postAction(name, state, props, rv) {
  console.group('Returned:');

  const returnedProps = parseActionReturnValue(rv);

  if (returnedProps.state === state) {
    console.log('State: (unchanged)');
  } else if (returnedProps.state !== undefined) {
    console.log('State:', returnedProps.state);
  }

  if (returnedProps.action) {
    console.log('Action:', returnedProps.action);
    // TODO: parse name of action function / first element of action tuple.
  }

  if (returnedProps.effects) {
    for (const [effectFn, props] of returnedProps.effects) {
      console.log('Effect: ' + getFunctionName(effectFn), props);
    }
  }
  console.groupEnd();

  // Close the group that includes both pre- and post-action logs.
  console.groupEnd();
}

/**
 * Logs the argument provided to an effect that is about to run.
 *
 * @param {string} name of the effect function.
 * @param {*} props provided to the effect function.
 */
export function preEffect(name, props) {
  console.group('Effect: ' + name);
  console.log('Props:', props);
}

/**
 * Logs the completion of an effect.
 *
 * @param {string} name of the effect function.
 * @param {*} props provided to the effect function.
 */
export function postEffect(name, props) {
  console.groupEnd();
}

/**
 * Parses the value returned by an action into an object with the following
 * properties:
 * - state
 * - action
 * - effects
 *
 * The return value is shaped like any of the following:
 * 1. A state value
 * 2. [state, [Effect, props], ...]
 * 3. [Action, props]
 *
 * @param {*} rv The value returned by an action.
 * @returns {Object}
 */
function parseActionReturnValue(rv) {
  const parsed = {};

  if (Array.isArray(rv)) {
    if (typeof rv[0] === 'function') {
      parsed.action = rv;
    } else {
      parsed.state = rv[0];
      parsed.effects = rv.slice(1);
    }
  } else {
    parsed.state = rv;
  }

  return parsed;
}
