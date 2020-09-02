/**
 * Returns a wrapped version the Hyperapp dispatch function. This special
 * dispatch function wraps all actions and effects with a special function that
 * logs the entry and exit conditions.
 *
 * @param {function} dispatch
 * @returns {function} a modified dispatch function
 */
export function wrapDispatch(dispatch) {
  return function traceDispatch(action, props) {
    // Hyperapp's dispatch function is called in a number of ways
    // ("signatures").
    //
    // 1. dispatch(state)
    //    Invocation with just a state. This happens when an Action returns a
    //    state.
    //
    // 2. dispatch([state, [effect, props], [effect, props], ...])
    //    Invocation with a state and Effect tuples. This is what happens when
    //    an Action returns a state and at least one Effect.
    //
    // 3. dispatch(action, props)
    //    Invocation with another Action and properties. Effects and subscriber
    //    functions call dispatch this way.
    //
    // 4. dispatch([action, props])
    //    Invocation with an Action / properties tuple. This is what happens
    //    when an Action returns another Action.
    //
    // This function wraps Hyperapp's own implementation of dispatch, and lets
    // us examine the signature that is being used.

    if (typeof action === 'function') {
      // Signature 3. An action will be dispatched.
      action = wrapAction(action);
    } else if (Array.isArray(action)) {
      if (typeof action[0] === 'function') {
        // Signature 4: An action will be dispatched. It is the first element of
        // the array.
        action[0] = wrapAction(action[0]);
      } else {
        // Signature 2: A new state has been provided. It is the first element
        // of the array.
        // The remaining elements are Effect tuples.
        for (let i = 1; i < action.length; i++) {
          const tuple = action[i];
          tuple[0] = wrapEffect(tuple[0]);
        }
      }
    } else {
      // Signature 1: A new state has been provided.
    }

    // Now call the original dispatch.
    dispatch(action, props);
  };
}

/**
 * Wraps an action in a function that will log the entry and exit.
 *
 * @param {Hyperapp.Action} actionFn
 * @returns {Hyperapp.Action}
 */
function wrapAction(actionFn) {
  // Don't wrap a wrapper. This could potentially happen because Hyperapp's
  // dispatch function is recursive.
  if (!actionFn['$isWrapped']) {
    function wrappedAction(state, props) {
      console.group('Action: ' + actionFn.name);

      // Log the arguments.
      console.group('Called with:');
      console.log('State:', state);
      console.log('Props:', props);
      console.groupEnd();

      const rv = actionFn(state, props);

      // Log the action's return value.
      console.group('Returned:');
      const returnedProps = parseActionReturnValue(rv);

      if (returnedProps.state === state) {
        console.log('State: (unchanged)');
      } else if (returnedProps.state !== undefined) {
        console.log('State:', returnedProps.state);
      }

      if (returnedProps.action) {
        console.log('Action:', returnedProps.action);
      }

      if (returnedProps.effects) {
        for (const [effectFn, props] of returnedProps.effects) {
          console.log('Effect: ' + effectFn.name, props);
        }
      }
      console.groupEnd();

      console.groupEnd();

      return rv;
    }

    // Indicate that this is now a wrapped function, so that we can avoid
    // wrapping it in another layer.
    wrappedAction['$isWrapped'] = true;
    return wrappedAction;
  } else {
    return actionFn;
  }
}

/**
 * Wraps an effect in a function that will log the entry and exit conditions.
 *
 * @param {Hyperapp.Effect} effectFn
 * @returns {Hyperapp.Effect}
 */
function wrapEffect(effectFn) {
  // Don't wrap a wrapper. This could potentially happen because Hyperapp's
  // dispatch function is recursive.
  if (!effectFn['$isWrapped']) {
    function wrappedEffect(dispatch, props) {
      console.group('Effect: ' + effectFn.name);
      console.log('Props:', props);

      const rv = effectFn(dispatch, props);

      console.groupEnd();

      return rv;
    }

    // Indicate that this is now a wrapped function, so that we can avoid
    // wrapping it in another layer.
    wrappedEffect['$isWrapped'] = true;
    return wrappedEffect;
  } else {
    return effectFn;
  }
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
