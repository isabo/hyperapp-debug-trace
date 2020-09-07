/**
 * Generates a Hyperapp middleware function that will call hook functions before
 * and after involing any action or effect, and after the state changes.
 *
 * @param {Object} props
 * @param {Hyperapp.Action} [props.onStateChange] A Hyperapp action function or
 *    tuple that will be called whenever the state changes.
 * @param {function} [props.preAction] A function that will called before any
 *    Hyperapp action is invoked. The function should take the following
 *    arguments:
 *    name  - the name of the action function
 *    state - the state that will be provided to the action function
 *    props - the second argument that the action function will be called with
 * * @param {function} [props.postAction] A function that will called after any
 *    Hyperapp action is invoked. The function should take the following
 *    arguments:
 *    name  - the name of the action function
 *    state - the state that was provided to the action function
 *    props - the second argument that the action function was called with
 *    rv    - the value returned by the action function
 * @param {function} [props.preEffect] A function that will called before any
 *    Hyperapp effect is invoked. The function should take the following
 *    arguments:
 *    name  - the name of the effect function
 *    props - the second argument that the effect function will be called with
 * @param {function} [props.postEffect] A function that will called after any
 *    Hyperapp effect is invoked. The function should take the following
 *    arguments:
 *    name  - the name of the effect function
 *    props - the second argument that the effect function was called with
 */
export function generateMiddleware({
  onStateChange,
  preAction,
  postAction,
  preEffect,
  postEffect,
}) {
  /**
   * Returns a wrapped version the Hyperapp dispatch function. This middleware
   * causes hooks before and after each action and effect invocation, and will
   * call a specified action whenever the state changes.
   *
   * @param {function} dispatch
   * @returns {function} a modified dispatch function
   */
  return function middleware(dispatch) {
    /**
     * This is the wrapped version of dispatch.
     */
    return function interceptedDispatch(action, props) {
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

      let newState;
      if (typeof action === 'function') {
        // Signature 3. An action will be dispatched.
        action = wrapAction(action, preAction, postAction);
      } else if (Array.isArray(action)) {
        if (typeof action[0] === 'function') {
          // Signature 4: An action will be dispatched. It is the first element
          // of the array.
          action[0] = wrapAction(action[0], preAction, postAction);
        } else {
          // Signature 2: A new state has been provided. It is the first element
          // of the array.
          newState = action[0];

          // The remaining elements are Effect tuples.
          for (let i = 1; i < action.length; i++) {
            const tuple = action[i];
            tuple[0] = wrapEffect(tuple[0], preEffect, postEffect);
          }
        }
      } else {
        // Signature 1: A new state has been provided.
        newState = action;
      }

      // Now call the original dispatch.
      dispatch(action, props);

      // If the above dispatch changed the state, call the action that processes
      // state changes.
      if (newState !== undefined && onStateChange) {
        dispatch(onStateChange);
      }
    };
  };
}

/**
 * Wraps an action in a function that will log the entry and exit.
 *
 * @param {Hyperapp.Action} actionFn
 * @returns {Hyperapp.Action}
 */
function wrapAction(actionFn, pre, post) {
  // Don't wrap a wrapper. This could potentially happen because Hyperapp's
  // dispatch function is recursive.
  if (!actionFn['$isWrapped'] && (pre || post)) {
    function wrappedAction(state, props) {
      const fname = getFunctionName(actionFn);

      if (pre) pre(fname, state, props);
      const rv = actionFn(state, props);
      if (post) post(fname, state, props, rv);

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
function wrapEffect(effectFn, pre, post) {
  // Don't wrap a wrapper. This could potentially happen because Hyperapp's
  // dispatch function is recursive.
  if (!effectFn['$isWrapped'] && (pre || post)) {
    function wrappedEffect(dispatch, props) {
      const fname = getFunctionName(effectFn);

      if (pre) pre(fname, props);
      effectFn(dispatch, props);
      if (post) post(fname, props);

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
 * Returns the name of a function without the 'bound ' prefix, which is added
 * when .bind() is called on a function.
 *
 * @param {function} fn
 * @return {string}
 */
function getFunctionName(fn) {
  return fn.name.split(' ').slice(-1);
}
