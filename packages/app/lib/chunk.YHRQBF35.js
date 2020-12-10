import {
  __toModule,
  _assertThisInitialized,
  _extends,
  _inheritsLoose,
  _objectWithoutProperties,
  _objectWithoutPropertiesLoose,
  _toConsumableArray,
  clsx_m_default,
  defaultTheme_default,
  formatMuiErrorMessage,
  makeStyles,
  require_hoist_non_react_statics_cjs,
  require_prop_types,
  useTheme
} from "./chunk.GLASK65Q.js";

// ../../node_modules/react-transition-group/esm/TransitionGroup.js
var import_prop_types = __toModule(require_prop_types());
import React2 from "https://cdn.skypack.dev/react";

// ../../node_modules/react-transition-group/esm/TransitionGroupContext.js
import React from "https://cdn.skypack.dev/react";
var TransitionGroupContext_default = React.createContext(null);

// ../../node_modules/react-transition-group/esm/utils/ChildMapping.js
import {Children, cloneElement, isValidElement} from "https://cdn.skypack.dev/react";
function getChildMapping(children, mapFn) {
  var mapper = function mapper2(child) {
    return mapFn && isValidElement(child) ? mapFn(child) : child;
  };
  var result = Object.create(null);
  if (children)
    Children.map(children, function(c) {
      return c;
    }).forEach(function(child) {
      result[child.key] = mapper(child);
    });
  return result;
}
function mergeChildMappings(prev, next) {
  prev = prev || {};
  next = next || {};
  function getValueForKey(key) {
    return key in next ? next[key] : prev[key];
  }
  var nextKeysPending = Object.create(null);
  var pendingKeys = [];
  for (var prevKey in prev) {
    if (prevKey in next) {
      if (pendingKeys.length) {
        nextKeysPending[prevKey] = pendingKeys;
        pendingKeys = [];
      }
    } else {
      pendingKeys.push(prevKey);
    }
  }
  var i;
  var childMapping = {};
  for (var nextKey in next) {
    if (nextKeysPending[nextKey]) {
      for (i = 0; i < nextKeysPending[nextKey].length; i++) {
        var pendingNextKey = nextKeysPending[nextKey][i];
        childMapping[nextKeysPending[nextKey][i]] = getValueForKey(pendingNextKey);
      }
    }
    childMapping[nextKey] = getValueForKey(nextKey);
  }
  for (i = 0; i < pendingKeys.length; i++) {
    childMapping[pendingKeys[i]] = getValueForKey(pendingKeys[i]);
  }
  return childMapping;
}
function getProp(child, prop, props) {
  return props[prop] != null ? props[prop] : child.props[prop];
}
function getInitialChildMapping(props, onExited) {
  return getChildMapping(props.children, function(child) {
    return cloneElement(child, {
      onExited: onExited.bind(null, child),
      in: true,
      appear: getProp(child, "appear", props),
      enter: getProp(child, "enter", props),
      exit: getProp(child, "exit", props)
    });
  });
}
function getNextChildMapping(nextProps, prevChildMapping, onExited) {
  var nextChildMapping = getChildMapping(nextProps.children);
  var children = mergeChildMappings(prevChildMapping, nextChildMapping);
  Object.keys(children).forEach(function(key) {
    var child = children[key];
    if (!isValidElement(child))
      return;
    var hasPrev = key in prevChildMapping;
    var hasNext = key in nextChildMapping;
    var prevChild = prevChildMapping[key];
    var isLeaving = isValidElement(prevChild) && !prevChild.props.in;
    if (hasNext && (!hasPrev || isLeaving)) {
      children[key] = cloneElement(child, {
        onExited: onExited.bind(null, child),
        in: true,
        exit: getProp(child, "exit", nextProps),
        enter: getProp(child, "enter", nextProps)
      });
    } else if (!hasNext && hasPrev && !isLeaving) {
      children[key] = cloneElement(child, {
        in: false
      });
    } else if (hasNext && hasPrev && isValidElement(prevChild)) {
      children[key] = cloneElement(child, {
        onExited: onExited.bind(null, child),
        in: prevChild.props.in,
        exit: getProp(child, "exit", nextProps),
        enter: getProp(child, "enter", nextProps)
      });
    }
  });
  return children;
}

// ../../node_modules/react-transition-group/esm/TransitionGroup.js
var values = Object.values || function(obj) {
  return Object.keys(obj).map(function(k) {
    return obj[k];
  });
};
var defaultProps = {
  component: "div",
  childFactory: function childFactory(child) {
    return child;
  }
};
var TransitionGroup = /* @__PURE__ */ function(_React$Component) {
  _inheritsLoose(TransitionGroup2, _React$Component);
  function TransitionGroup2(props, context) {
    var _this;
    _this = _React$Component.call(this, props, context) || this;
    var handleExited = _this.handleExited.bind(_assertThisInitialized(_this));
    _this.state = {
      contextValue: {
        isMounting: true
      },
      handleExited,
      firstRender: true
    };
    return _this;
  }
  var _proto = TransitionGroup2.prototype;
  _proto.componentDidMount = function componentDidMount() {
    this.mounted = true;
    this.setState({
      contextValue: {
        isMounting: false
      }
    });
  };
  _proto.componentWillUnmount = function componentWillUnmount() {
    this.mounted = false;
  };
  TransitionGroup2.getDerivedStateFromProps = function getDerivedStateFromProps(nextProps, _ref) {
    var prevChildMapping = _ref.children, handleExited = _ref.handleExited, firstRender = _ref.firstRender;
    return {
      children: firstRender ? getInitialChildMapping(nextProps, handleExited) : getNextChildMapping(nextProps, prevChildMapping, handleExited),
      firstRender: false
    };
  };
  _proto.handleExited = function handleExited(child, node) {
    var currentChildMapping = getChildMapping(this.props.children);
    if (child.key in currentChildMapping)
      return;
    if (child.props.onExited) {
      child.props.onExited(node);
    }
    if (this.mounted) {
      this.setState(function(state) {
        var children = _extends({}, state.children);
        delete children[child.key];
        return {
          children
        };
      });
    }
  };
  _proto.render = function render() {
    var _this$props = this.props, Component = _this$props.component, childFactory2 = _this$props.childFactory, props = _objectWithoutPropertiesLoose(_this$props, ["component", "childFactory"]);
    var contextValue = this.state.contextValue;
    var children = values(this.state.children).map(childFactory2);
    delete props.appear;
    delete props.enter;
    delete props.exit;
    if (Component === null) {
      return /* @__PURE__ */ React2.createElement(TransitionGroupContext_default.Provider, {
        value: contextValue
      }, children);
    }
    return /* @__PURE__ */ React2.createElement(TransitionGroupContext_default.Provider, {
      value: contextValue
    }, /* @__PURE__ */ React2.createElement(Component, props, children));
  };
  return TransitionGroup2;
}(React2.Component);
TransitionGroup.propTypes = false ? {
  component: import_prop_types.default.any,
  children: import_prop_types.default.node,
  appear: import_prop_types.default.bool,
  enter: import_prop_types.default.bool,
  exit: import_prop_types.default.bool,
  childFactory: import_prop_types.default.func
} : {};
TransitionGroup.defaultProps = defaultProps;
var TransitionGroup_default = TransitionGroup;

// node_modules/@material-ui/core/esm/ButtonBase/ButtonBase.js
var import_prop_types5 = __toModule(require_prop_types());
import {
  createElement as createElement3,
  forwardRef as forwardRef2,
  useEffect as useEffect4,
  useImperativeHandle as useImperativeHandle2,
  useRef as useRef3,
  useState as useState3
} from "https://cdn.skypack.dev/react";
import {
  findDOMNode as findDOMNode2
} from "https://cdn.skypack.dev/react-dom";

// node_modules/@material-ui/core/esm/utils/useForkRef.js
import {
  useMemo
} from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/core/esm/utils/setRef.js
function setRef(ref, value) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

// node_modules/@material-ui/core/esm/utils/useForkRef.js
function useForkRef(refA, refB) {
  return useMemo(function() {
    if (refA == null && refB == null) {
      return null;
    }
    return function(refValue) {
      setRef(refA, refValue);
      setRef(refB, refValue);
    };
  }, [refA, refB]);
}

// node_modules/@material-ui/core/esm/utils/useEventCallback.js
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef
} from "https://cdn.skypack.dev/react";
var useEnhancedEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
function useEventCallback(fn) {
  var ref = useRef(fn);
  useEnhancedEffect(function() {
    ref.current = fn;
  });
  return useCallback(function() {
    return (0, ref.current).apply(void 0, arguments);
  }, []);
}

// node_modules/@material-ui/styles/esm/getThemeProps/getThemeProps.js
function getThemeProps(params) {
  var theme = params.theme, name = params.name, props = params.props;
  if (!theme || !theme.props || !theme.props[name]) {
    return props;
  }
  var defaultProps2 = theme.props[name];
  var propName;
  for (propName in defaultProps2) {
    if (props[propName] === void 0) {
      props[propName] = defaultProps2[propName];
    }
  }
  return props;
}

// node_modules/@material-ui/styles/esm/withStyles/withStyles.js
var import_prop_types2 = __toModule(require_prop_types());
var import_hoist_non_react_statics = __toModule(require_hoist_non_react_statics_cjs());
import React5 from "https://cdn.skypack.dev/react";
var withStyles = function withStyles2(stylesOrCreator) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  return function(Component) {
    var defaultTheme = options.defaultTheme, _options$withTheme = options.withTheme, withTheme = _options$withTheme === void 0 ? false : _options$withTheme, name = options.name, stylesOptions = _objectWithoutProperties(options, ["defaultTheme", "withTheme", "name"]);
    if (false) {
      if (Component === void 0) {
        throw new Error(["You are calling withStyles(styles)(Component) with an undefined component.", "You may have forgotten to import it."].join("\n"));
      }
    }
    var classNamePrefix = name;
    if (false) {
      if (!name) {
        var displayName = getDisplayName(Component);
        if (displayName !== void 0) {
          classNamePrefix = displayName;
        }
      }
    }
    var useStyles = makeStyles(stylesOrCreator, _extends({
      defaultTheme,
      Component,
      name: name || Component.displayName,
      classNamePrefix
    }, stylesOptions));
    var WithStyles = /* @__PURE__ */ React5.forwardRef(function WithStyles2(props, ref) {
      var classesProp = props.classes, innerRef = props.innerRef, other = _objectWithoutProperties(props, ["classes", "innerRef"]);
      var classes = useStyles(_extends({}, Component.defaultProps, props));
      var theme;
      var more = other;
      if (typeof name === "string" || withTheme) {
        theme = useTheme() || defaultTheme;
        if (name) {
          more = getThemeProps({
            theme,
            name,
            props: other
          });
        }
        if (withTheme && !more.theme) {
          more.theme = theme;
        }
      }
      return /* @__PURE__ */ React5.createElement(Component, _extends({
        ref: innerRef || ref,
        classes
      }, more));
    });
    false ? WithStyles.propTypes = {
      classes: import_prop_types2.default.object,
      innerRef: chainPropTypes(import_prop_types2.default.oneOfType([import_prop_types2.default.func, import_prop_types2.default.object]), function(props) {
        if (props.innerRef == null) {
          return null;
        }
        return null;
      })
    } : void 0;
    if (false) {
      WithStyles.displayName = "WithStyles(".concat(getDisplayName(Component), ")");
    }
    import_hoist_non_react_statics.default(WithStyles, Component);
    if (false) {
      WithStyles.Naked = Component;
      WithStyles.options = options;
      WithStyles.useStyles = useStyles;
    }
    return WithStyles;
  };
};
var withStyles_default = withStyles;

// node_modules/@material-ui/core/esm/styles/withStyles.js
function withStyles3(stylesOrCreator, options) {
  return withStyles_default(stylesOrCreator, _extends({
    defaultTheme: defaultTheme_default
  }, options));
}
var withStyles_default2 = withStyles3;

// node_modules/@material-ui/core/esm/utils/useIsFocusVisible.js
import {
  useCallback as useCallback2,
  useDebugValue
} from "https://cdn.skypack.dev/react";
import {
  findDOMNode
} from "https://cdn.skypack.dev/react-dom";
var hadKeyboardEvent = true;
var hadFocusVisibleRecently = false;
var hadFocusVisibleRecentlyTimeout = null;
var inputTypesWhitelist = {
  text: true,
  search: true,
  url: true,
  tel: true,
  email: true,
  password: true,
  number: true,
  date: true,
  month: true,
  week: true,
  time: true,
  datetime: true,
  "datetime-local": true
};
function focusTriggersKeyboardModality(node) {
  var type = node.type, tagName = node.tagName;
  if (tagName === "INPUT" && inputTypesWhitelist[type] && !node.readOnly) {
    return true;
  }
  if (tagName === "TEXTAREA" && !node.readOnly) {
    return true;
  }
  if (node.isContentEditable) {
    return true;
  }
  return false;
}
function handleKeyDown(event) {
  if (event.metaKey || event.altKey || event.ctrlKey) {
    return;
  }
  hadKeyboardEvent = true;
}
function handlePointerDown() {
  hadKeyboardEvent = false;
}
function handleVisibilityChange() {
  if (this.visibilityState === "hidden") {
    if (hadFocusVisibleRecently) {
      hadKeyboardEvent = true;
    }
  }
}
function prepare(doc) {
  doc.addEventListener("keydown", handleKeyDown, true);
  doc.addEventListener("mousedown", handlePointerDown, true);
  doc.addEventListener("pointerdown", handlePointerDown, true);
  doc.addEventListener("touchstart", handlePointerDown, true);
  doc.addEventListener("visibilitychange", handleVisibilityChange, true);
}
function isFocusVisible(event) {
  var target = event.target;
  try {
    return target.matches(":focus-visible");
  } catch (error) {
  }
  return hadKeyboardEvent || focusTriggersKeyboardModality(target);
}
function handleBlurVisible() {
  hadFocusVisibleRecently = true;
  window.clearTimeout(hadFocusVisibleRecentlyTimeout);
  hadFocusVisibleRecentlyTimeout = window.setTimeout(function() {
    hadFocusVisibleRecently = false;
  }, 100);
}
function useIsFocusVisible() {
  var ref = useCallback2(function(instance) {
    var node = findDOMNode(instance);
    if (node != null) {
      prepare(node.ownerDocument);
    }
  }, []);
  if (false) {
    useDebugValue(isFocusVisible);
  }
  return {
    isFocusVisible,
    onBlurVisible: handleBlurVisible,
    ref
  };
}

// node_modules/@material-ui/core/esm/ButtonBase/TouchRipple.js
var import_prop_types4 = __toModule(require_prop_types());
import {
  createElement as createElement2,
  forwardRef,
  memo,
  useCallback as useCallback3,
  useEffect as useEffect3,
  useImperativeHandle,
  useRef as useRef2,
  useState as useState2
} from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/core/esm/ButtonBase/Ripple.js
var import_prop_types3 = __toModule(require_prop_types());
import {
  createElement,
  useEffect as useEffect2,
  useLayoutEffect as useLayoutEffect2,
  useState
} from "https://cdn.skypack.dev/react";
var useEnhancedEffect2 = typeof window === "undefined" ? useEffect2 : useLayoutEffect2;
function Ripple(props) {
  var classes = props.classes, _props$pulsate = props.pulsate, pulsate = _props$pulsate === void 0 ? false : _props$pulsate, rippleX = props.rippleX, rippleY = props.rippleY, rippleSize = props.rippleSize, inProp = props.in, _props$onExited = props.onExited, onExited = _props$onExited === void 0 ? function() {
  } : _props$onExited, timeout = props.timeout;
  var _React$useState = useState(false), leaving = _React$useState[0], setLeaving = _React$useState[1];
  var rippleClassName = clsx_m_default(classes.ripple, classes.rippleVisible, pulsate && classes.ripplePulsate);
  var rippleStyles = {
    width: rippleSize,
    height: rippleSize,
    top: -(rippleSize / 2) + rippleY,
    left: -(rippleSize / 2) + rippleX
  };
  var childClassName = clsx_m_default(classes.child, leaving && classes.childLeaving, pulsate && classes.childPulsate);
  var handleExited = useEventCallback(onExited);
  useEnhancedEffect2(function() {
    if (!inProp) {
      setLeaving(true);
      var timeoutId = setTimeout(handleExited, timeout);
      return function() {
        clearTimeout(timeoutId);
      };
    }
    return void 0;
  }, [handleExited, inProp, timeout]);
  return /* @__PURE__ */ createElement("span", {
    className: rippleClassName,
    style: rippleStyles
  }, /* @__PURE__ */ createElement("span", {
    className: childClassName
  }));
}
false ? Ripple.propTypes = {
  classes: import_prop_types3.default.object.isRequired,
  in: import_prop_types3.default.bool,
  onExited: import_prop_types3.default.func,
  pulsate: import_prop_types3.default.bool,
  rippleSize: import_prop_types3.default.number,
  rippleX: import_prop_types3.default.number,
  rippleY: import_prop_types3.default.number,
  timeout: import_prop_types3.default.number.isRequired
} : void 0;
var Ripple_default = Ripple;

// node_modules/@material-ui/core/esm/ButtonBase/TouchRipple.js
var DURATION = 550;
var DELAY_RIPPLE = 80;
var styles = function styles2(theme) {
  return {
    root: {
      overflow: "hidden",
      pointerEvents: "none",
      position: "absolute",
      zIndex: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      borderRadius: "inherit"
    },
    ripple: {
      opacity: 0,
      position: "absolute"
    },
    rippleVisible: {
      opacity: 0.3,
      transform: "scale(1)",
      animation: "$enter ".concat(DURATION, "ms ").concat(theme.transitions.easing.easeInOut)
    },
    ripplePulsate: {
      animationDuration: "".concat(theme.transitions.duration.shorter, "ms")
    },
    child: {
      opacity: 1,
      display: "block",
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      backgroundColor: "currentColor"
    },
    childLeaving: {
      opacity: 0,
      animation: "$exit ".concat(DURATION, "ms ").concat(theme.transitions.easing.easeInOut)
    },
    childPulsate: {
      position: "absolute",
      left: 0,
      top: 0,
      animation: "$pulsate 2500ms ".concat(theme.transitions.easing.easeInOut, " 200ms infinite")
    },
    "@keyframes enter": {
      "0%": {
        transform: "scale(0)",
        opacity: 0.1
      },
      "100%": {
        transform: "scale(1)",
        opacity: 0.3
      }
    },
    "@keyframes exit": {
      "0%": {
        opacity: 1
      },
      "100%": {
        opacity: 0
      }
    },
    "@keyframes pulsate": {
      "0%": {
        transform: "scale(1)"
      },
      "50%": {
        transform: "scale(0.92)"
      },
      "100%": {
        transform: "scale(1)"
      }
    }
  };
};
var TouchRipple = /* @__PURE__ */ forwardRef(function TouchRipple2(props, ref) {
  var _props$center = props.center, centerProp = _props$center === void 0 ? false : _props$center, classes = props.classes, className = props.className, other = _objectWithoutProperties(props, ["center", "classes", "className"]);
  var _React$useState = useState2([]), ripples = _React$useState[0], setRipples = _React$useState[1];
  var nextKey = useRef2(0);
  var rippleCallback = useRef2(null);
  useEffect3(function() {
    if (rippleCallback.current) {
      rippleCallback.current();
      rippleCallback.current = null;
    }
  }, [ripples]);
  var ignoringMouseDown = useRef2(false);
  var startTimer = useRef2(null);
  var startTimerCommit = useRef2(null);
  var container = useRef2(null);
  useEffect3(function() {
    return function() {
      clearTimeout(startTimer.current);
    };
  }, []);
  var startCommit = useCallback3(function(params) {
    var pulsate2 = params.pulsate, rippleX = params.rippleX, rippleY = params.rippleY, rippleSize = params.rippleSize, cb = params.cb;
    setRipples(function(oldRipples) {
      return [].concat(_toConsumableArray(oldRipples), [/* @__PURE__ */ createElement2(Ripple_default, {
        key: nextKey.current,
        classes,
        timeout: DURATION,
        pulsate: pulsate2,
        rippleX,
        rippleY,
        rippleSize
      })]);
    });
    nextKey.current += 1;
    rippleCallback.current = cb;
  }, [classes]);
  var start = useCallback3(function() {
    var event = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var cb = arguments.length > 2 ? arguments[2] : void 0;
    var _options$pulsate = options.pulsate, pulsate2 = _options$pulsate === void 0 ? false : _options$pulsate, _options$center = options.center, center = _options$center === void 0 ? centerProp || options.pulsate : _options$center, _options$fakeElement = options.fakeElement, fakeElement = _options$fakeElement === void 0 ? false : _options$fakeElement;
    if (event.type === "mousedown" && ignoringMouseDown.current) {
      ignoringMouseDown.current = false;
      return;
    }
    if (event.type === "touchstart") {
      ignoringMouseDown.current = true;
    }
    var element = fakeElement ? null : container.current;
    var rect = element ? element.getBoundingClientRect() : {
      width: 0,
      height: 0,
      left: 0,
      top: 0
    };
    var rippleX;
    var rippleY;
    var rippleSize;
    if (center || event.clientX === 0 && event.clientY === 0 || !event.clientX && !event.touches) {
      rippleX = Math.round(rect.width / 2);
      rippleY = Math.round(rect.height / 2);
    } else {
      var _ref = event.touches ? event.touches[0] : event, clientX = _ref.clientX, clientY = _ref.clientY;
      rippleX = Math.round(clientX - rect.left);
      rippleY = Math.round(clientY - rect.top);
    }
    if (center) {
      rippleSize = Math.sqrt((2 * Math.pow(rect.width, 2) + Math.pow(rect.height, 2)) / 3);
      if (rippleSize % 2 === 0) {
        rippleSize += 1;
      }
    } else {
      var sizeX = Math.max(Math.abs((element ? element.clientWidth : 0) - rippleX), rippleX) * 2 + 2;
      var sizeY = Math.max(Math.abs((element ? element.clientHeight : 0) - rippleY), rippleY) * 2 + 2;
      rippleSize = Math.sqrt(Math.pow(sizeX, 2) + Math.pow(sizeY, 2));
    }
    if (event.touches) {
      if (startTimerCommit.current === null) {
        startTimerCommit.current = function() {
          startCommit({
            pulsate: pulsate2,
            rippleX,
            rippleY,
            rippleSize,
            cb
          });
        };
        startTimer.current = setTimeout(function() {
          if (startTimerCommit.current) {
            startTimerCommit.current();
            startTimerCommit.current = null;
          }
        }, DELAY_RIPPLE);
      }
    } else {
      startCommit({
        pulsate: pulsate2,
        rippleX,
        rippleY,
        rippleSize,
        cb
      });
    }
  }, [centerProp, startCommit]);
  var pulsate = useCallback3(function() {
    start({}, {
      pulsate: true
    });
  }, [start]);
  var stop = useCallback3(function(event, cb) {
    clearTimeout(startTimer.current);
    if (event.type === "touchend" && startTimerCommit.current) {
      event.persist();
      startTimerCommit.current();
      startTimerCommit.current = null;
      startTimer.current = setTimeout(function() {
        stop(event, cb);
      });
      return;
    }
    startTimerCommit.current = null;
    setRipples(function(oldRipples) {
      if (oldRipples.length > 0) {
        return oldRipples.slice(1);
      }
      return oldRipples;
    });
    rippleCallback.current = cb;
  }, []);
  useImperativeHandle(ref, function() {
    return {
      pulsate,
      start,
      stop
    };
  }, [pulsate, start, stop]);
  return /* @__PURE__ */ createElement2("span", _extends({
    className: clsx_m_default(classes.root, className),
    ref: container
  }, other), /* @__PURE__ */ createElement2(TransitionGroup_default, {
    component: null,
    exit: true
  }, ripples));
});
false ? TouchRipple.propTypes = {
  center: import_prop_types4.default.bool,
  classes: import_prop_types4.default.object.isRequired,
  className: import_prop_types4.default.string
} : void 0;
var TouchRipple_default = withStyles_default2(styles, {
  flip: false,
  name: "MuiTouchRipple"
})(/* @__PURE__ */ memo(TouchRipple));

// node_modules/@material-ui/core/esm/ButtonBase/ButtonBase.js
var styles3 = {
  root: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    WebkitTapHighlightColor: "transparent",
    backgroundColor: "transparent",
    outline: 0,
    border: 0,
    margin: 0,
    borderRadius: 0,
    padding: 0,
    cursor: "pointer",
    userSelect: "none",
    verticalAlign: "middle",
    "-moz-appearance": "none",
    "-webkit-appearance": "none",
    textDecoration: "none",
    color: "inherit",
    "&::-moz-focus-inner": {
      borderStyle: "none"
    },
    "&$disabled": {
      pointerEvents: "none",
      cursor: "default"
    },
    "@media print": {
      colorAdjust: "exact"
    }
  },
  disabled: {},
  focusVisible: {}
};
var ButtonBase = /* @__PURE__ */ forwardRef2(function ButtonBase2(props, ref) {
  var action = props.action, buttonRefProp = props.buttonRef, _props$centerRipple = props.centerRipple, centerRipple = _props$centerRipple === void 0 ? false : _props$centerRipple, children = props.children, classes = props.classes, className = props.className, _props$component = props.component, component = _props$component === void 0 ? "button" : _props$component, _props$disabled = props.disabled, disabled = _props$disabled === void 0 ? false : _props$disabled, _props$disableRipple = props.disableRipple, disableRipple = _props$disableRipple === void 0 ? false : _props$disableRipple, _props$disableTouchRi = props.disableTouchRipple, disableTouchRipple = _props$disableTouchRi === void 0 ? false : _props$disableTouchRi, _props$focusRipple = props.focusRipple, focusRipple = _props$focusRipple === void 0 ? false : _props$focusRipple, focusVisibleClassName = props.focusVisibleClassName, onBlur = props.onBlur, onClick = props.onClick, onFocus = props.onFocus, onFocusVisible = props.onFocusVisible, onKeyDown = props.onKeyDown, onKeyUp = props.onKeyUp, onMouseDown = props.onMouseDown, onMouseLeave = props.onMouseLeave, onMouseUp = props.onMouseUp, onTouchEnd = props.onTouchEnd, onTouchMove = props.onTouchMove, onTouchStart = props.onTouchStart, onDragLeave = props.onDragLeave, _props$tabIndex = props.tabIndex, tabIndex = _props$tabIndex === void 0 ? 0 : _props$tabIndex, TouchRippleProps = props.TouchRippleProps, _props$type = props.type, type = _props$type === void 0 ? "button" : _props$type, other = _objectWithoutProperties(props, ["action", "buttonRef", "centerRipple", "children", "classes", "className", "component", "disabled", "disableRipple", "disableTouchRipple", "focusRipple", "focusVisibleClassName", "onBlur", "onClick", "onFocus", "onFocusVisible", "onKeyDown", "onKeyUp", "onMouseDown", "onMouseLeave", "onMouseUp", "onTouchEnd", "onTouchMove", "onTouchStart", "onDragLeave", "tabIndex", "TouchRippleProps", "type"]);
  var buttonRef = useRef3(null);
  function getButtonNode() {
    return findDOMNode2(buttonRef.current);
  }
  var rippleRef = useRef3(null);
  var _React$useState = useState3(false), focusVisible = _React$useState[0], setFocusVisible = _React$useState[1];
  if (disabled && focusVisible) {
    setFocusVisible(false);
  }
  var _useIsFocusVisible = useIsFocusVisible(), isFocusVisible2 = _useIsFocusVisible.isFocusVisible, onBlurVisible = _useIsFocusVisible.onBlurVisible, focusVisibleRef = _useIsFocusVisible.ref;
  useImperativeHandle2(action, function() {
    return {
      focusVisible: function focusVisible2() {
        setFocusVisible(true);
        buttonRef.current.focus();
      }
    };
  }, []);
  useEffect4(function() {
    if (focusVisible && focusRipple && !disableRipple) {
      rippleRef.current.pulsate();
    }
  }, [disableRipple, focusRipple, focusVisible]);
  function useRippleHandler(rippleAction, eventCallback) {
    var skipRippleAction = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : disableTouchRipple;
    return useEventCallback(function(event) {
      if (eventCallback) {
        eventCallback(event);
      }
      var ignore = skipRippleAction;
      if (!ignore && rippleRef.current) {
        rippleRef.current[rippleAction](event);
      }
      return true;
    });
  }
  var handleMouseDown = useRippleHandler("start", onMouseDown);
  var handleDragLeave = useRippleHandler("stop", onDragLeave);
  var handleMouseUp = useRippleHandler("stop", onMouseUp);
  var handleMouseLeave = useRippleHandler("stop", function(event) {
    if (focusVisible) {
      event.preventDefault();
    }
    if (onMouseLeave) {
      onMouseLeave(event);
    }
  });
  var handleTouchStart = useRippleHandler("start", onTouchStart);
  var handleTouchEnd = useRippleHandler("stop", onTouchEnd);
  var handleTouchMove = useRippleHandler("stop", onTouchMove);
  var handleBlur = useRippleHandler("stop", function(event) {
    if (focusVisible) {
      onBlurVisible(event);
      setFocusVisible(false);
    }
    if (onBlur) {
      onBlur(event);
    }
  }, false);
  var handleFocus = useEventCallback(function(event) {
    if (!buttonRef.current) {
      buttonRef.current = event.currentTarget;
    }
    if (isFocusVisible2(event)) {
      setFocusVisible(true);
      if (onFocusVisible) {
        onFocusVisible(event);
      }
    }
    if (onFocus) {
      onFocus(event);
    }
  });
  var isNonNativeButton = function isNonNativeButton2() {
    var button = getButtonNode();
    return component && component !== "button" && !(button.tagName === "A" && button.href);
  };
  var keydownRef = useRef3(false);
  var handleKeyDown2 = useEventCallback(function(event) {
    if (focusRipple && !keydownRef.current && focusVisible && rippleRef.current && event.key === " ") {
      keydownRef.current = true;
      event.persist();
      rippleRef.current.stop(event, function() {
        rippleRef.current.start(event);
      });
    }
    if (event.target === event.currentTarget && isNonNativeButton() && event.key === " ") {
      event.preventDefault();
    }
    if (onKeyDown) {
      onKeyDown(event);
    }
    if (event.target === event.currentTarget && isNonNativeButton() && event.key === "Enter" && !disabled) {
      event.preventDefault();
      if (onClick) {
        onClick(event);
      }
    }
  });
  var handleKeyUp = useEventCallback(function(event) {
    if (focusRipple && event.key === " " && rippleRef.current && focusVisible && !event.defaultPrevented) {
      keydownRef.current = false;
      event.persist();
      rippleRef.current.stop(event, function() {
        rippleRef.current.pulsate(event);
      });
    }
    if (onKeyUp) {
      onKeyUp(event);
    }
    if (onClick && event.target === event.currentTarget && isNonNativeButton() && event.key === " " && !event.defaultPrevented) {
      onClick(event);
    }
  });
  var ComponentProp = component;
  if (ComponentProp === "button" && other.href) {
    ComponentProp = "a";
  }
  var buttonProps = {};
  if (ComponentProp === "button") {
    buttonProps.type = type;
    buttonProps.disabled = disabled;
  } else {
    if (ComponentProp !== "a" || !other.href) {
      buttonProps.role = "button";
    }
    buttonProps["aria-disabled"] = disabled;
  }
  var handleUserRef = useForkRef(buttonRefProp, ref);
  var handleOwnRef = useForkRef(focusVisibleRef, buttonRef);
  var handleRef = useForkRef(handleUserRef, handleOwnRef);
  var _React$useState2 = useState3(false), mountedState = _React$useState2[0], setMountedState = _React$useState2[1];
  useEffect4(function() {
    setMountedState(true);
  }, []);
  var enableTouchRipple = mountedState && !disableRipple && !disabled;
  if (false) {
    useEffect4(function() {
      if (enableTouchRipple && !rippleRef.current) {
        console.error(["Material-UI: The `component` prop provided to ButtonBase is invalid.", "Please make sure the children prop is rendered in this custom component."].join("\n"));
      }
    }, [enableTouchRipple]);
  }
  return /* @__PURE__ */ createElement3(ComponentProp, _extends({
    className: clsx_m_default(classes.root, className, focusVisible && [classes.focusVisible, focusVisibleClassName], disabled && classes.disabled),
    onBlur: handleBlur,
    onClick,
    onFocus: handleFocus,
    onKeyDown: handleKeyDown2,
    onKeyUp: handleKeyUp,
    onMouseDown: handleMouseDown,
    onMouseLeave: handleMouseLeave,
    onMouseUp: handleMouseUp,
    onDragLeave: handleDragLeave,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    onTouchStart: handleTouchStart,
    ref: handleRef,
    tabIndex: disabled ? -1 : tabIndex
  }, buttonProps, other), children, enableTouchRipple ? /* @__PURE__ */ createElement3(TouchRipple_default, _extends({
    ref: rippleRef,
    center: centerRipple
  }, TouchRippleProps)) : null);
});
false ? ButtonBase.propTypes = {
  action: refType_default,
  buttonRef: refType_default,
  centerRipple: import_prop_types5.default.bool,
  children: import_prop_types5.default.node,
  classes: import_prop_types5.default.object,
  className: import_prop_types5.default.string,
  component: elementTypeAcceptingRef_default,
  disabled: import_prop_types5.default.bool,
  disableRipple: import_prop_types5.default.bool,
  disableTouchRipple: import_prop_types5.default.bool,
  focusRipple: import_prop_types5.default.bool,
  focusVisibleClassName: import_prop_types5.default.string,
  href: import_prop_types5.default.string,
  onBlur: import_prop_types5.default.func,
  onClick: import_prop_types5.default.func,
  onDragLeave: import_prop_types5.default.func,
  onFocus: import_prop_types5.default.func,
  onFocusVisible: import_prop_types5.default.func,
  onKeyDown: import_prop_types5.default.func,
  onKeyUp: import_prop_types5.default.func,
  onMouseDown: import_prop_types5.default.func,
  onMouseLeave: import_prop_types5.default.func,
  onMouseUp: import_prop_types5.default.func,
  onTouchEnd: import_prop_types5.default.func,
  onTouchMove: import_prop_types5.default.func,
  onTouchStart: import_prop_types5.default.func,
  tabIndex: import_prop_types5.default.oneOfType([import_prop_types5.default.number, import_prop_types5.default.string]),
  TouchRippleProps: import_prop_types5.default.object,
  type: import_prop_types5.default.oneOfType([import_prop_types5.default.oneOf(["button", "reset", "submit"]), import_prop_types5.default.string])
} : void 0;
var ButtonBase_default = withStyles_default2(styles3, {
  name: "MuiButtonBase"
})(ButtonBase);

// node_modules/@material-ui/core/esm/utils/capitalize.js
function capitalize(string) {
  if (typeof string !== "string") {
    throw new Error(false ? "Material-UI: capitalize(string) expects a string argument." : formatMuiErrorMessage(7));
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export {
  TransitionGroupContext_default,
  setRef,
  capitalize,
  useEventCallback,
  getThemeProps,
  useForkRef,
  withStyles_default2 as withStyles_default,
  ButtonBase_default
};
//# sourceMappingURL=chunk.6JTFEY6H.js.map
