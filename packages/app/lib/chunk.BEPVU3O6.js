import {
  ButtonBase_default,
  capitalize,
  useForkRef,
  withStyles_default
} from "./chunk.D4WESEBB.js";
import {
  Scrollable_default,
  index_esm_default
} from "./chunk.DHPQHMT7.js";
import {
  __toModule,
  _assertThisInitialized,
  _extends,
  _inheritsLoose,
  _objectWithoutProperties,
  _objectWithoutPropertiesLoose,
  clsx_m_default,
  require_prop_types
} from "./chunk.JCC25JS6.js";

// node_modules/@material-ui/core/esm/ListItem/ListItem.js
var import_prop_types = __toModule(require_prop_types());
import {
  Children,
  createElement,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef
} from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/core/esm/utils/isMuiElement.js
import {
  isValidElement
} from "https://cdn.skypack.dev/react";
function isMuiElement(element, muiNames) {
  return /* @__PURE__ */ isValidElement(element) && muiNames.indexOf(element.type.muiName) !== -1;
}

// node_modules/@material-ui/core/esm/List/ListContext.js
import {
  createContext
} from "https://cdn.skypack.dev/react";
var ListContext = createContext({});
if (false) {
  ListContext.displayName = "ListContext";
}
var ListContext_default = ListContext;

// node_modules/@material-ui/core/esm/ListItem/ListItem.js
import {
  findDOMNode
} from "https://cdn.skypack.dev/react-dom";
var styles = function styles2(theme) {
  return {
    root: {
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
      position: "relative",
      textDecoration: "none",
      width: "100%",
      boxSizing: "border-box",
      textAlign: "left",
      paddingTop: 8,
      paddingBottom: 8,
      "&$focusVisible": {
        backgroundColor: theme.palette.action.selected
      },
      "&$selected, &$selected:hover": {
        backgroundColor: theme.palette.action.selected
      },
      "&$disabled": {
        opacity: 0.5
      }
    },
    container: {
      position: "relative"
    },
    focusVisible: {},
    dense: {
      paddingTop: 4,
      paddingBottom: 4
    },
    alignItemsFlexStart: {
      alignItems: "flex-start"
    },
    disabled: {},
    divider: {
      borderBottom: "1px solid ".concat(theme.palette.divider),
      backgroundClip: "padding-box"
    },
    gutters: {
      paddingLeft: 16,
      paddingRight: 16
    },
    button: {
      transition: theme.transitions.create("background-color", {
        duration: theme.transitions.duration.shortest
      }),
      "&:hover": {
        textDecoration: "none",
        backgroundColor: theme.palette.action.hover,
        "@media (hover: none)": {
          backgroundColor: "transparent"
        }
      }
    },
    secondaryAction: {
      paddingRight: 48
    },
    selected: {}
  };
};
var useEnhancedEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
var ListItem = /* @__PURE__ */ forwardRef(function ListItem2(props, ref) {
  var _props$alignItems = props.alignItems, alignItems = _props$alignItems === void 0 ? "center" : _props$alignItems, _props$autoFocus = props.autoFocus, autoFocus = _props$autoFocus === void 0 ? false : _props$autoFocus, _props$button = props.button, button = _props$button === void 0 ? false : _props$button, childrenProp = props.children, classes = props.classes, className = props.className, componentProp = props.component, _props$ContainerCompo = props.ContainerComponent, ContainerComponent = _props$ContainerCompo === void 0 ? "li" : _props$ContainerCompo, _props$ContainerProps = props.ContainerProps;
  _props$ContainerProps = _props$ContainerProps === void 0 ? {} : _props$ContainerProps;
  var ContainerClassName = _props$ContainerProps.className, ContainerProps = _objectWithoutProperties(_props$ContainerProps, ["className"]), _props$dense = props.dense, dense = _props$dense === void 0 ? false : _props$dense, _props$disabled = props.disabled, disabled = _props$disabled === void 0 ? false : _props$disabled, _props$disableGutters = props.disableGutters, disableGutters = _props$disableGutters === void 0 ? false : _props$disableGutters, _props$divider = props.divider, divider = _props$divider === void 0 ? false : _props$divider, focusVisibleClassName = props.focusVisibleClassName, _props$selected = props.selected, selected = _props$selected === void 0 ? false : _props$selected, other = _objectWithoutProperties(props, ["alignItems", "autoFocus", "button", "children", "classes", "className", "component", "ContainerComponent", "ContainerProps", "dense", "disabled", "disableGutters", "divider", "focusVisibleClassName", "selected"]);
  var context = useContext(ListContext_default);
  var childContext = {
    dense: dense || context.dense || false,
    alignItems
  };
  var listItemRef = useRef(null);
  useEnhancedEffect(function() {
    if (autoFocus) {
      if (listItemRef.current) {
        listItemRef.current.focus();
      } else if (false) {
        console.error("Material-UI: Unable to set focus to a ListItem whose component has not been rendered.");
      }
    }
  }, [autoFocus]);
  var children = Children.toArray(childrenProp);
  var hasSecondaryAction = children.length && isMuiElement(children[children.length - 1], ["ListItemSecondaryAction"]);
  var handleOwnRef = useCallback(function(instance) {
    listItemRef.current = findDOMNode(instance);
  }, []);
  var handleRef = useForkRef(handleOwnRef, ref);
  var componentProps = _extends({
    className: clsx_m_default(classes.root, className, childContext.dense && classes.dense, !disableGutters && classes.gutters, divider && classes.divider, disabled && classes.disabled, button && classes.button, alignItems !== "center" && classes.alignItemsFlexStart, hasSecondaryAction && classes.secondaryAction, selected && classes.selected),
    disabled
  }, other);
  var Component = componentProp || "li";
  if (button) {
    componentProps.component = componentProp || "div";
    componentProps.focusVisibleClassName = clsx_m_default(classes.focusVisible, focusVisibleClassName);
    Component = ButtonBase_default;
  }
  if (hasSecondaryAction) {
    Component = !componentProps.component && !componentProp ? "div" : Component;
    if (ContainerComponent === "li") {
      if (Component === "li") {
        Component = "div";
      } else if (componentProps.component === "li") {
        componentProps.component = "div";
      }
    }
    return /* @__PURE__ */ createElement(ListContext_default.Provider, {
      value: childContext
    }, /* @__PURE__ */ createElement(ContainerComponent, _extends({
      className: clsx_m_default(classes.container, ContainerClassName),
      ref: handleRef
    }, ContainerProps), /* @__PURE__ */ createElement(Component, componentProps, children), children.pop()));
  }
  return /* @__PURE__ */ createElement(ListContext_default.Provider, {
    value: childContext
  }, /* @__PURE__ */ createElement(Component, _extends({
    ref: handleRef
  }, componentProps), children));
});
false ? ListItem.propTypes = {
  alignItems: import_prop_types.default.oneOf(["flex-start", "center"]),
  autoFocus: import_prop_types.default.bool,
  button: import_prop_types.default.bool,
  children: chainPropTypes(import_prop_types.default.node, function(props) {
    var children = Children.toArray(props.children);
    var secondaryActionIndex = -1;
    for (var i = children.length - 1; i >= 0; i -= 1) {
      var child = children[i];
      if (isMuiElement(child, ["ListItemSecondaryAction"])) {
        secondaryActionIndex = i;
        break;
      }
    }
    if (secondaryActionIndex !== -1 && secondaryActionIndex !== children.length - 1) {
      return new Error("Material-UI: You used an element after ListItemSecondaryAction. For ListItem to detect that it has a secondary action you must pass it as the last child to ListItem.");
    }
    return null;
  }),
  classes: import_prop_types.default.object.isRequired,
  className: import_prop_types.default.string,
  component: import_prop_types.default.elementType,
  ContainerComponent: import_prop_types.default.elementType,
  ContainerProps: import_prop_types.default.object,
  dense: import_prop_types.default.bool,
  disabled: import_prop_types.default.bool,
  disableGutters: import_prop_types.default.bool,
  divider: import_prop_types.default.bool,
  focusVisibleClassName: import_prop_types.default.string,
  selected: import_prop_types.default.bool
} : void 0;
var ListItem_default = withStyles_default(styles, {
  name: "MuiListItem"
})(ListItem);

// node_modules/@material-ui/core/esm/ListItemSecondaryAction/ListItemSecondaryAction.js
var import_prop_types2 = __toModule(require_prop_types());
import {
  createElement as createElement2,
  forwardRef as forwardRef2
} from "https://cdn.skypack.dev/react";
var styles3 = {
  root: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: "translateY(-50%)"
  }
};
var ListItemSecondaryAction = /* @__PURE__ */ forwardRef2(function ListItemSecondaryAction2(props, ref) {
  var classes = props.classes, className = props.className, other = _objectWithoutProperties(props, ["classes", "className"]);
  return /* @__PURE__ */ createElement2("div", _extends({
    className: clsx_m_default(classes.root, className),
    ref
  }, other));
});
false ? ListItemSecondaryAction.propTypes = {
  children: import_prop_types2.default.node,
  classes: import_prop_types2.default.object,
  className: import_prop_types2.default.string
} : void 0;
ListItemSecondaryAction.muiName = "ListItemSecondaryAction";
var ListItemSecondaryAction_default = withStyles_default(styles3, {
  name: "MuiListItemSecondaryAction"
})(ListItemSecondaryAction);

// node_modules/@material-ui/core/esm/ListItemText/ListItemText.js
var import_prop_types4 = __toModule(require_prop_types());
import {
  createElement as createElement4,
  forwardRef as forwardRef4,
  useContext as useContext2
} from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/core/esm/Typography/Typography.js
var import_prop_types3 = __toModule(require_prop_types());
import {
  createElement as createElement3,
  forwardRef as forwardRef3
} from "https://cdn.skypack.dev/react";
var styles4 = function styles5(theme) {
  return {
    root: {
      margin: 0
    },
    body2: theme.typography.body2,
    body1: theme.typography.body1,
    caption: theme.typography.caption,
    button: theme.typography.button,
    h1: theme.typography.h1,
    h2: theme.typography.h2,
    h3: theme.typography.h3,
    h4: theme.typography.h4,
    h5: theme.typography.h5,
    h6: theme.typography.h6,
    subtitle1: theme.typography.subtitle1,
    subtitle2: theme.typography.subtitle2,
    overline: theme.typography.overline,
    srOnly: {
      position: "absolute",
      height: 1,
      width: 1,
      overflow: "hidden"
    },
    alignLeft: {
      textAlign: "left"
    },
    alignCenter: {
      textAlign: "center"
    },
    alignRight: {
      textAlign: "right"
    },
    alignJustify: {
      textAlign: "justify"
    },
    noWrap: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    gutterBottom: {
      marginBottom: "0.35em"
    },
    paragraph: {
      marginBottom: 16
    },
    colorInherit: {
      color: "inherit"
    },
    colorPrimary: {
      color: theme.palette.primary.main
    },
    colorSecondary: {
      color: theme.palette.secondary.main
    },
    colorTextPrimary: {
      color: theme.palette.text.primary
    },
    colorTextSecondary: {
      color: theme.palette.text.secondary
    },
    colorError: {
      color: theme.palette.error.main
    },
    displayInline: {
      display: "inline"
    },
    displayBlock: {
      display: "block"
    }
  };
};
var defaultVariantMapping = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  subtitle1: "h6",
  subtitle2: "h6",
  body1: "p",
  body2: "p"
};
var Typography = /* @__PURE__ */ forwardRef3(function Typography2(props, ref) {
  var _props$align = props.align, align = _props$align === void 0 ? "inherit" : _props$align, classes = props.classes, className = props.className, _props$color = props.color, color = _props$color === void 0 ? "initial" : _props$color, component = props.component, _props$display = props.display, display = _props$display === void 0 ? "initial" : _props$display, _props$gutterBottom = props.gutterBottom, gutterBottom = _props$gutterBottom === void 0 ? false : _props$gutterBottom, _props$noWrap = props.noWrap, noWrap = _props$noWrap === void 0 ? false : _props$noWrap, _props$paragraph = props.paragraph, paragraph = _props$paragraph === void 0 ? false : _props$paragraph, _props$variant = props.variant, variant = _props$variant === void 0 ? "body1" : _props$variant, _props$variantMapping = props.variantMapping, variantMapping = _props$variantMapping === void 0 ? defaultVariantMapping : _props$variantMapping, other = _objectWithoutProperties(props, ["align", "classes", "className", "color", "component", "display", "gutterBottom", "noWrap", "paragraph", "variant", "variantMapping"]);
  var Component = component || (paragraph ? "p" : variantMapping[variant] || defaultVariantMapping[variant]) || "span";
  return /* @__PURE__ */ createElement3(Component, _extends({
    className: clsx_m_default(classes.root, className, variant !== "inherit" && classes[variant], color !== "initial" && classes["color".concat(capitalize(color))], noWrap && classes.noWrap, gutterBottom && classes.gutterBottom, paragraph && classes.paragraph, align !== "inherit" && classes["align".concat(capitalize(align))], display !== "initial" && classes["display".concat(capitalize(display))]),
    ref
  }, other));
});
false ? Typography.propTypes = {
  align: import_prop_types3.default.oneOf(["inherit", "left", "center", "right", "justify"]),
  children: import_prop_types3.default.node,
  classes: import_prop_types3.default.object.isRequired,
  className: import_prop_types3.default.string,
  color: import_prop_types3.default.oneOf(["initial", "inherit", "primary", "secondary", "textPrimary", "textSecondary", "error"]),
  component: import_prop_types3.default.elementType,
  display: import_prop_types3.default.oneOf(["initial", "block", "inline"]),
  gutterBottom: import_prop_types3.default.bool,
  noWrap: import_prop_types3.default.bool,
  paragraph: import_prop_types3.default.bool,
  variant: import_prop_types3.default.oneOf(["h1", "h2", "h3", "h4", "h5", "h6", "subtitle1", "subtitle2", "body1", "body2", "caption", "button", "overline", "srOnly", "inherit"]),
  variantMapping: import_prop_types3.default.object
} : void 0;
var Typography_default = withStyles_default(styles4, {
  name: "MuiTypography"
})(Typography);

// node_modules/@material-ui/core/esm/ListItemText/ListItemText.js
var styles6 = {
  root: {
    flex: "1 1 auto",
    minWidth: 0,
    marginTop: 4,
    marginBottom: 4
  },
  multiline: {
    marginTop: 6,
    marginBottom: 6
  },
  dense: {},
  inset: {
    paddingLeft: 56
  },
  primary: {},
  secondary: {}
};
var ListItemText = /* @__PURE__ */ forwardRef4(function ListItemText2(props, ref) {
  var children = props.children, classes = props.classes, className = props.className, _props$disableTypogra = props.disableTypography, disableTypography = _props$disableTypogra === void 0 ? false : _props$disableTypogra, _props$inset = props.inset, inset = _props$inset === void 0 ? false : _props$inset, primaryProp = props.primary, primaryTypographyProps = props.primaryTypographyProps, secondaryProp = props.secondary, secondaryTypographyProps = props.secondaryTypographyProps, other = _objectWithoutProperties(props, ["children", "classes", "className", "disableTypography", "inset", "primary", "primaryTypographyProps", "secondary", "secondaryTypographyProps"]);
  var _React$useContext = useContext2(ListContext_default), dense = _React$useContext.dense;
  var primary = primaryProp != null ? primaryProp : children;
  if (primary != null && primary.type !== Typography_default && !disableTypography) {
    primary = /* @__PURE__ */ createElement4(Typography_default, _extends({
      variant: dense ? "body2" : "body1",
      className: classes.primary,
      component: "span",
      display: "block"
    }, primaryTypographyProps), primary);
  }
  var secondary = secondaryProp;
  if (secondary != null && secondary.type !== Typography_default && !disableTypography) {
    secondary = /* @__PURE__ */ createElement4(Typography_default, _extends({
      variant: "body2",
      className: classes.secondary,
      color: "textSecondary",
      display: "block"
    }, secondaryTypographyProps), secondary);
  }
  return /* @__PURE__ */ createElement4("div", _extends({
    className: clsx_m_default(classes.root, className, dense && classes.dense, inset && classes.inset, primary && secondary && classes.multiline),
    ref
  }, other), primary, secondary);
});
false ? ListItemText.propTypes = {
  children: import_prop_types4.default.node,
  classes: import_prop_types4.default.object,
  className: import_prop_types4.default.string,
  disableTypography: import_prop_types4.default.bool,
  inset: import_prop_types4.default.bool,
  primary: import_prop_types4.default.node,
  primaryTypographyProps: import_prop_types4.default.object,
  secondary: import_prop_types4.default.node,
  secondaryTypographyProps: import_prop_types4.default.object
} : void 0;
var ListItemText_default = withStyles_default(styles6, {
  name: "MuiListItemText"
})(ListItemText);

// src/client/components/List/List.tsx
import React7 from "https://cdn.skypack.dev/react";

// ../../node_modules/memoize-one/dist/memoize-one.esm.js
function areInputsEqual(newInputs, lastInputs) {
  if (newInputs.length !== lastInputs.length) {
    return false;
  }
  for (var i = 0; i < newInputs.length; i++) {
    if (newInputs[i] !== lastInputs[i]) {
      return false;
    }
  }
  return true;
}
function memoizeOne(resultFn, isEqual) {
  if (isEqual === void 0) {
    isEqual = areInputsEqual;
  }
  var lastThis;
  var lastArgs = [];
  var lastResult;
  var calledOnce = false;
  function memoized() {
    var newArgs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      newArgs[_i] = arguments[_i];
    }
    if (calledOnce && lastThis === this && isEqual(newArgs, lastArgs)) {
      return lastResult;
    }
    lastResult = resultFn.apply(this, newArgs);
    calledOnce = true;
    lastThis = this;
    lastArgs = newArgs;
    return lastResult;
  }
  return memoized;
}
var memoize_one_esm_default = memoizeOne;

// ../../node_modules/react-window/dist/index.esm.js
import {createElement as createElement5, PureComponent} from "https://cdn.skypack.dev/react";
var hasNativePerformanceNow = typeof performance === "object" && typeof performance.now === "function";
var now = hasNativePerformanceNow ? function() {
  return performance.now();
} : function() {
  return Date.now();
};
function cancelTimeout(timeoutID) {
  cancelAnimationFrame(timeoutID.id);
}
function requestTimeout(callback, delay) {
  var start = now();
  function tick() {
    if (now() - start >= delay) {
      callback.call(null);
    } else {
      timeoutID.id = requestAnimationFrame(tick);
    }
  }
  var timeoutID = {
    id: requestAnimationFrame(tick)
  };
  return timeoutID;
}
var cachedRTLResult = null;
function getRTLOffsetType(recalculate) {
  if (recalculate === void 0) {
    recalculate = false;
  }
  if (cachedRTLResult === null || recalculate) {
    var outerDiv = document.createElement("div");
    var outerStyle = outerDiv.style;
    outerStyle.width = "50px";
    outerStyle.height = "50px";
    outerStyle.overflow = "scroll";
    outerStyle.direction = "rtl";
    var innerDiv = document.createElement("div");
    var innerStyle = innerDiv.style;
    innerStyle.width = "100px";
    innerStyle.height = "100px";
    outerDiv.appendChild(innerDiv);
    document.body.appendChild(outerDiv);
    if (outerDiv.scrollLeft > 0) {
      cachedRTLResult = "positive-descending";
    } else {
      outerDiv.scrollLeft = 1;
      if (outerDiv.scrollLeft === 0) {
        cachedRTLResult = "negative";
      } else {
        cachedRTLResult = "positive-ascending";
      }
    }
    document.body.removeChild(outerDiv);
    return cachedRTLResult;
  }
  return cachedRTLResult;
}
var devWarningsOverscanCount = null;
var devWarningsOverscanRowsColumnsCount = null;
var devWarningsTagName = null;
if (false) {
  if (typeof window !== "undefined" && typeof window.WeakSet !== "undefined") {
    devWarningsOverscanCount = /* @__PURE__ */ new WeakSet();
    devWarningsOverscanRowsColumnsCount = /* @__PURE__ */ new WeakSet();
    devWarningsTagName = /* @__PURE__ */ new WeakSet();
  }
}
var IS_SCROLLING_DEBOUNCE_INTERVAL$1 = 150;
var defaultItemKey$1 = function defaultItemKey(index, data) {
  return index;
};
var devWarningsDirection = null;
var devWarningsTagName$1 = null;
if (false) {
  if (typeof window !== "undefined" && typeof window.WeakSet !== "undefined") {
    devWarningsDirection = /* @__PURE__ */ new WeakSet();
    devWarningsTagName$1 = /* @__PURE__ */ new WeakSet();
  }
}
function createListComponent(_ref) {
  var _class, _temp;
  var getItemOffset2 = _ref.getItemOffset, getEstimatedTotalSize3 = _ref.getEstimatedTotalSize, getItemSize2 = _ref.getItemSize, getOffsetForIndexAndAlignment2 = _ref.getOffsetForIndexAndAlignment, getStartIndexForOffset2 = _ref.getStartIndexForOffset, getStopIndexForStartIndex2 = _ref.getStopIndexForStartIndex, initInstanceProps2 = _ref.initInstanceProps, shouldResetStyleCacheOnItemSizeChange = _ref.shouldResetStyleCacheOnItemSizeChange, validateProps2 = _ref.validateProps;
  return _temp = _class = /* @__PURE__ */ function(_PureComponent) {
    _inheritsLoose(List2, _PureComponent);
    function List2(props) {
      var _this;
      _this = _PureComponent.call(this, props) || this;
      _this._instanceProps = initInstanceProps2(_this.props, _assertThisInitialized(_assertThisInitialized(_this)));
      _this._outerRef = void 0;
      _this._resetIsScrollingTimeoutId = null;
      _this.state = {
        instance: _assertThisInitialized(_assertThisInitialized(_this)),
        isScrolling: false,
        scrollDirection: "forward",
        scrollOffset: typeof _this.props.initialScrollOffset === "number" ? _this.props.initialScrollOffset : 0,
        scrollUpdateWasRequested: false
      };
      _this._callOnItemsRendered = void 0;
      _this._callOnItemsRendered = memoize_one_esm_default(function(overscanStartIndex, overscanStopIndex, visibleStartIndex, visibleStopIndex) {
        return _this.props.onItemsRendered({
          overscanStartIndex,
          overscanStopIndex,
          visibleStartIndex,
          visibleStopIndex
        });
      });
      _this._callOnScroll = void 0;
      _this._callOnScroll = memoize_one_esm_default(function(scrollDirection, scrollOffset, scrollUpdateWasRequested) {
        return _this.props.onScroll({
          scrollDirection,
          scrollOffset,
          scrollUpdateWasRequested
        });
      });
      _this._getItemStyle = void 0;
      _this._getItemStyle = function(index) {
        var _this$props = _this.props, direction = _this$props.direction, itemSize = _this$props.itemSize, layout = _this$props.layout;
        var itemStyleCache = _this._getItemStyleCache(shouldResetStyleCacheOnItemSizeChange && itemSize, shouldResetStyleCacheOnItemSizeChange && layout, shouldResetStyleCacheOnItemSizeChange && direction);
        var style;
        if (itemStyleCache.hasOwnProperty(index)) {
          style = itemStyleCache[index];
        } else {
          var _offset = getItemOffset2(_this.props, index, _this._instanceProps);
          var size = getItemSize2(_this.props, index, _this._instanceProps);
          var isHorizontal = direction === "horizontal" || layout === "horizontal";
          var isRtl = direction === "rtl";
          var offsetHorizontal = isHorizontal ? _offset : 0;
          itemStyleCache[index] = style = {
            position: "absolute",
            left: isRtl ? void 0 : offsetHorizontal,
            right: isRtl ? offsetHorizontal : void 0,
            top: !isHorizontal ? _offset : 0,
            height: !isHorizontal ? size : "100%",
            width: isHorizontal ? size : "100%"
          };
        }
        return style;
      };
      _this._getItemStyleCache = void 0;
      _this._getItemStyleCache = memoize_one_esm_default(function(_, __, ___) {
        return {};
      });
      _this._onScrollHorizontal = function(event) {
        var _event$currentTarget = event.currentTarget, clientWidth = _event$currentTarget.clientWidth, scrollLeft = _event$currentTarget.scrollLeft, scrollWidth = _event$currentTarget.scrollWidth;
        _this.setState(function(prevState) {
          if (prevState.scrollOffset === scrollLeft) {
            return null;
          }
          var direction = _this.props.direction;
          var scrollOffset = scrollLeft;
          if (direction === "rtl") {
            switch (getRTLOffsetType()) {
              case "negative":
                scrollOffset = -scrollLeft;
                break;
              case "positive-descending":
                scrollOffset = scrollWidth - clientWidth - scrollLeft;
                break;
            }
          }
          scrollOffset = Math.max(0, Math.min(scrollOffset, scrollWidth - clientWidth));
          return {
            isScrolling: true,
            scrollDirection: prevState.scrollOffset < scrollLeft ? "forward" : "backward",
            scrollOffset,
            scrollUpdateWasRequested: false
          };
        }, _this._resetIsScrollingDebounced);
      };
      _this._onScrollVertical = function(event) {
        var _event$currentTarget2 = event.currentTarget, clientHeight = _event$currentTarget2.clientHeight, scrollHeight = _event$currentTarget2.scrollHeight, scrollTop = _event$currentTarget2.scrollTop;
        _this.setState(function(prevState) {
          if (prevState.scrollOffset === scrollTop) {
            return null;
          }
          var scrollOffset = Math.max(0, Math.min(scrollTop, scrollHeight - clientHeight));
          return {
            isScrolling: true,
            scrollDirection: prevState.scrollOffset < scrollOffset ? "forward" : "backward",
            scrollOffset,
            scrollUpdateWasRequested: false
          };
        }, _this._resetIsScrollingDebounced);
      };
      _this._outerRefSetter = function(ref) {
        var outerRef = _this.props.outerRef;
        _this._outerRef = ref;
        if (typeof outerRef === "function") {
          outerRef(ref);
        } else if (outerRef != null && typeof outerRef === "object" && outerRef.hasOwnProperty("current")) {
          outerRef.current = ref;
        }
      };
      _this._resetIsScrollingDebounced = function() {
        if (_this._resetIsScrollingTimeoutId !== null) {
          cancelTimeout(_this._resetIsScrollingTimeoutId);
        }
        _this._resetIsScrollingTimeoutId = requestTimeout(_this._resetIsScrolling, IS_SCROLLING_DEBOUNCE_INTERVAL$1);
      };
      _this._resetIsScrolling = function() {
        _this._resetIsScrollingTimeoutId = null;
        _this.setState({
          isScrolling: false
        }, function() {
          _this._getItemStyleCache(-1, null);
        });
      };
      return _this;
    }
    List2.getDerivedStateFromProps = function getDerivedStateFromProps(nextProps, prevState) {
      validateSharedProps$1(nextProps, prevState);
      validateProps2(nextProps);
      return null;
    };
    var _proto = List2.prototype;
    _proto.scrollTo = function scrollTo(scrollOffset) {
      scrollOffset = Math.max(0, scrollOffset);
      this.setState(function(prevState) {
        if (prevState.scrollOffset === scrollOffset) {
          return null;
        }
        return {
          scrollDirection: prevState.scrollOffset < scrollOffset ? "forward" : "backward",
          scrollOffset,
          scrollUpdateWasRequested: true
        };
      }, this._resetIsScrollingDebounced);
    };
    _proto.scrollToItem = function scrollToItem(index, align) {
      if (align === void 0) {
        align = "auto";
      }
      var itemCount = this.props.itemCount;
      var scrollOffset = this.state.scrollOffset;
      index = Math.max(0, Math.min(index, itemCount - 1));
      this.scrollTo(getOffsetForIndexAndAlignment2(this.props, index, align, scrollOffset, this._instanceProps));
    };
    _proto.componentDidMount = function componentDidMount() {
      var _this$props2 = this.props, direction = _this$props2.direction, initialScrollOffset = _this$props2.initialScrollOffset, layout = _this$props2.layout;
      if (typeof initialScrollOffset === "number" && this._outerRef != null) {
        var outerRef = this._outerRef;
        if (direction === "horizontal" || layout === "horizontal") {
          outerRef.scrollLeft = initialScrollOffset;
        } else {
          outerRef.scrollTop = initialScrollOffset;
        }
      }
      this._callPropsCallbacks();
    };
    _proto.componentDidUpdate = function componentDidUpdate() {
      var _this$props3 = this.props, direction = _this$props3.direction, layout = _this$props3.layout;
      var _this$state = this.state, scrollOffset = _this$state.scrollOffset, scrollUpdateWasRequested = _this$state.scrollUpdateWasRequested;
      if (scrollUpdateWasRequested && this._outerRef != null) {
        var outerRef = this._outerRef;
        if (direction === "horizontal" || layout === "horizontal") {
          if (direction === "rtl") {
            switch (getRTLOffsetType()) {
              case "negative":
                outerRef.scrollLeft = -scrollOffset;
                break;
              case "positive-ascending":
                outerRef.scrollLeft = scrollOffset;
                break;
              default:
                var clientWidth = outerRef.clientWidth, scrollWidth = outerRef.scrollWidth;
                outerRef.scrollLeft = scrollWidth - clientWidth - scrollOffset;
                break;
            }
          } else {
            outerRef.scrollLeft = scrollOffset;
          }
        } else {
          outerRef.scrollTop = scrollOffset;
        }
      }
      this._callPropsCallbacks();
    };
    _proto.componentWillUnmount = function componentWillUnmount() {
      if (this._resetIsScrollingTimeoutId !== null) {
        cancelTimeout(this._resetIsScrollingTimeoutId);
      }
    };
    _proto.render = function render() {
      var _this$props4 = this.props, children = _this$props4.children, className = _this$props4.className, direction = _this$props4.direction, height = _this$props4.height, innerRef = _this$props4.innerRef, innerElementType = _this$props4.innerElementType, innerTagName = _this$props4.innerTagName, itemCount = _this$props4.itemCount, itemData = _this$props4.itemData, _this$props4$itemKey = _this$props4.itemKey, itemKey = _this$props4$itemKey === void 0 ? defaultItemKey$1 : _this$props4$itemKey, layout = _this$props4.layout, outerElementType = _this$props4.outerElementType, outerTagName = _this$props4.outerTagName, style = _this$props4.style, useIsScrolling = _this$props4.useIsScrolling, width = _this$props4.width;
      var isScrolling = this.state.isScrolling;
      var isHorizontal = direction === "horizontal" || layout === "horizontal";
      var onScroll = isHorizontal ? this._onScrollHorizontal : this._onScrollVertical;
      var _this$_getRangeToRend = this._getRangeToRender(), startIndex = _this$_getRangeToRend[0], stopIndex = _this$_getRangeToRend[1];
      var items = [];
      if (itemCount > 0) {
        for (var _index = startIndex; _index <= stopIndex; _index++) {
          items.push(createElement5(children, {
            data: itemData,
            key: itemKey(_index, itemData),
            index: _index,
            isScrolling: useIsScrolling ? isScrolling : void 0,
            style: this._getItemStyle(_index)
          }));
        }
      }
      var estimatedTotalSize = getEstimatedTotalSize3(this.props, this._instanceProps);
      return createElement5(outerElementType || outerTagName || "div", {
        className,
        onScroll,
        ref: this._outerRefSetter,
        style: _extends({
          position: "relative",
          height,
          width,
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          willChange: "transform",
          direction
        }, style)
      }, createElement5(innerElementType || innerTagName || "div", {
        children: items,
        ref: innerRef,
        style: {
          height: isHorizontal ? "100%" : estimatedTotalSize,
          pointerEvents: isScrolling ? "none" : void 0,
          width: isHorizontal ? estimatedTotalSize : "100%"
        }
      }));
    };
    _proto._callPropsCallbacks = function _callPropsCallbacks() {
      if (typeof this.props.onItemsRendered === "function") {
        var itemCount = this.props.itemCount;
        if (itemCount > 0) {
          var _this$_getRangeToRend2 = this._getRangeToRender(), _overscanStartIndex = _this$_getRangeToRend2[0], _overscanStopIndex = _this$_getRangeToRend2[1], _visibleStartIndex = _this$_getRangeToRend2[2], _visibleStopIndex = _this$_getRangeToRend2[3];
          this._callOnItemsRendered(_overscanStartIndex, _overscanStopIndex, _visibleStartIndex, _visibleStopIndex);
        }
      }
      if (typeof this.props.onScroll === "function") {
        var _this$state2 = this.state, _scrollDirection = _this$state2.scrollDirection, _scrollOffset = _this$state2.scrollOffset, _scrollUpdateWasRequested = _this$state2.scrollUpdateWasRequested;
        this._callOnScroll(_scrollDirection, _scrollOffset, _scrollUpdateWasRequested);
      }
    };
    _proto._getRangeToRender = function _getRangeToRender() {
      var _this$props5 = this.props, itemCount = _this$props5.itemCount, overscanCount = _this$props5.overscanCount;
      var _this$state3 = this.state, isScrolling = _this$state3.isScrolling, scrollDirection = _this$state3.scrollDirection, scrollOffset = _this$state3.scrollOffset;
      if (itemCount === 0) {
        return [0, 0, 0, 0];
      }
      var startIndex = getStartIndexForOffset2(this.props, scrollOffset, this._instanceProps);
      var stopIndex = getStopIndexForStartIndex2(this.props, startIndex, scrollOffset, this._instanceProps);
      var overscanBackward = !isScrolling || scrollDirection === "backward" ? Math.max(1, overscanCount) : 1;
      var overscanForward = !isScrolling || scrollDirection === "forward" ? Math.max(1, overscanCount) : 1;
      return [Math.max(0, startIndex - overscanBackward), Math.max(0, Math.min(itemCount - 1, stopIndex + overscanForward)), startIndex, stopIndex];
    };
    return List2;
  }(PureComponent), _class.defaultProps = {
    direction: "ltr",
    itemData: void 0,
    layout: "vertical",
    overscanCount: 2,
    useIsScrolling: false
  }, _temp;
}
var validateSharedProps$1 = function validateSharedProps(_ref2, _ref3) {
  var children = _ref2.children, direction = _ref2.direction, height = _ref2.height, layout = _ref2.layout, innerTagName = _ref2.innerTagName, outerTagName = _ref2.outerTagName, width = _ref2.width;
  var instance = _ref3.instance;
  if (false) {
    if (innerTagName != null || outerTagName != null) {
      if (devWarningsTagName$1 && !devWarningsTagName$1.has(instance)) {
        devWarningsTagName$1.add(instance);
        console.warn("The innerTagName and outerTagName props have been deprecated. Please use the innerElementType and outerElementType props instead.");
      }
    }
    var isHorizontal = direction === "horizontal" || layout === "horizontal";
    switch (direction) {
      case "horizontal":
      case "vertical":
        if (devWarningsDirection && !devWarningsDirection.has(instance)) {
          devWarningsDirection.add(instance);
          console.warn('The direction prop should be either "ltr" (default) or "rtl". Please use the layout prop to specify "vertical" (default) or "horizontal" orientation.');
        }
        break;
      case "ltr":
      case "rtl":
        break;
      default:
        throw Error('An invalid "direction" prop has been specified. Value should be either "ltr" or "rtl". ' + ('"' + direction + '" was specified.'));
    }
    switch (layout) {
      case "horizontal":
      case "vertical":
        break;
      default:
        throw Error('An invalid "layout" prop has been specified. Value should be either "horizontal" or "vertical". ' + ('"' + layout + '" was specified.'));
    }
    if (children == null) {
      throw Error('An invalid "children" prop has been specified. Value should be a React component. ' + ('"' + (children === null ? "null" : typeof children) + '" was specified.'));
    }
    if (isHorizontal && typeof width !== "number") {
      throw Error('An invalid "width" prop has been specified. Horizontal lists must specify a number for width. ' + ('"' + (width === null ? "null" : typeof width) + '" was specified.'));
    } else if (!isHorizontal && typeof height !== "number") {
      throw Error('An invalid "height" prop has been specified. Vertical lists must specify a number for height. ' + ('"' + (height === null ? "null" : typeof height) + '" was specified.'));
    }
  }
};
var DEFAULT_ESTIMATED_ITEM_SIZE$1 = 50;
var getItemMetadata$1 = function getItemMetadata(props, index, instanceProps) {
  var _ref = props, itemSize = _ref.itemSize;
  var itemMetadataMap = instanceProps.itemMetadataMap, lastMeasuredIndex = instanceProps.lastMeasuredIndex;
  if (index > lastMeasuredIndex) {
    var offset = 0;
    if (lastMeasuredIndex >= 0) {
      var itemMetadata = itemMetadataMap[lastMeasuredIndex];
      offset = itemMetadata.offset + itemMetadata.size;
    }
    for (var i = lastMeasuredIndex + 1; i <= index; i++) {
      var size = itemSize(i);
      itemMetadataMap[i] = {
        offset,
        size
      };
      offset += size;
    }
    instanceProps.lastMeasuredIndex = index;
  }
  return itemMetadataMap[index];
};
var findNearestItem$1 = function findNearestItem(props, instanceProps, offset) {
  var itemMetadataMap = instanceProps.itemMetadataMap, lastMeasuredIndex = instanceProps.lastMeasuredIndex;
  var lastMeasuredItemOffset = lastMeasuredIndex > 0 ? itemMetadataMap[lastMeasuredIndex].offset : 0;
  if (lastMeasuredItemOffset >= offset) {
    return findNearestItemBinarySearch$1(props, instanceProps, lastMeasuredIndex, 0, offset);
  } else {
    return findNearestItemExponentialSearch$1(props, instanceProps, Math.max(0, lastMeasuredIndex), offset);
  }
};
var findNearestItemBinarySearch$1 = function findNearestItemBinarySearch(props, instanceProps, high, low, offset) {
  while (low <= high) {
    var middle = low + Math.floor((high - low) / 2);
    var currentOffset = getItemMetadata$1(props, middle, instanceProps).offset;
    if (currentOffset === offset) {
      return middle;
    } else if (currentOffset < offset) {
      low = middle + 1;
    } else if (currentOffset > offset) {
      high = middle - 1;
    }
  }
  if (low > 0) {
    return low - 1;
  } else {
    return 0;
  }
};
var findNearestItemExponentialSearch$1 = function findNearestItemExponentialSearch(props, instanceProps, index, offset) {
  var itemCount = props.itemCount;
  var interval = 1;
  while (index < itemCount && getItemMetadata$1(props, index, instanceProps).offset < offset) {
    index += interval;
    interval *= 2;
  }
  return findNearestItemBinarySearch$1(props, instanceProps, Math.min(index, itemCount - 1), Math.floor(index / 2), offset);
};
var getEstimatedTotalSize = function getEstimatedTotalSize2(_ref2, _ref3) {
  var itemCount = _ref2.itemCount;
  var itemMetadataMap = _ref3.itemMetadataMap, estimatedItemSize = _ref3.estimatedItemSize, lastMeasuredIndex = _ref3.lastMeasuredIndex;
  var totalSizeOfMeasuredItems = 0;
  if (lastMeasuredIndex >= itemCount) {
    lastMeasuredIndex = itemCount - 1;
  }
  if (lastMeasuredIndex >= 0) {
    var itemMetadata = itemMetadataMap[lastMeasuredIndex];
    totalSizeOfMeasuredItems = itemMetadata.offset + itemMetadata.size;
  }
  var numUnmeasuredItems = itemCount - lastMeasuredIndex - 1;
  var totalSizeOfUnmeasuredItems = numUnmeasuredItems * estimatedItemSize;
  return totalSizeOfMeasuredItems + totalSizeOfUnmeasuredItems;
};
var VariableSizeList = /* @__PURE__ */ createListComponent({
  getItemOffset: function getItemOffset(props, index, instanceProps) {
    return getItemMetadata$1(props, index, instanceProps).offset;
  },
  getItemSize: function getItemSize(props, index, instanceProps) {
    return instanceProps.itemMetadataMap[index].size;
  },
  getEstimatedTotalSize,
  getOffsetForIndexAndAlignment: function getOffsetForIndexAndAlignment(props, index, align, scrollOffset, instanceProps) {
    var direction = props.direction, height = props.height, layout = props.layout, width = props.width;
    var isHorizontal = direction === "horizontal" || layout === "horizontal";
    var size = isHorizontal ? width : height;
    var itemMetadata = getItemMetadata$1(props, index, instanceProps);
    var estimatedTotalSize = getEstimatedTotalSize(props, instanceProps);
    var maxOffset = Math.max(0, Math.min(estimatedTotalSize - size, itemMetadata.offset));
    var minOffset = Math.max(0, itemMetadata.offset - size + itemMetadata.size);
    if (align === "smart") {
      if (scrollOffset >= minOffset - size && scrollOffset <= maxOffset + size) {
        align = "auto";
      } else {
        align = "center";
      }
    }
    switch (align) {
      case "start":
        return maxOffset;
      case "end":
        return minOffset;
      case "center":
        return Math.round(minOffset + (maxOffset - minOffset) / 2);
      case "auto":
      default:
        if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
          return scrollOffset;
        } else if (scrollOffset < minOffset) {
          return minOffset;
        } else {
          return maxOffset;
        }
    }
  },
  getStartIndexForOffset: function getStartIndexForOffset(props, offset, instanceProps) {
    return findNearestItem$1(props, instanceProps, offset);
  },
  getStopIndexForStartIndex: function getStopIndexForStartIndex(props, startIndex, scrollOffset, instanceProps) {
    var direction = props.direction, height = props.height, itemCount = props.itemCount, layout = props.layout, width = props.width;
    var isHorizontal = direction === "horizontal" || layout === "horizontal";
    var size = isHorizontal ? width : height;
    var itemMetadata = getItemMetadata$1(props, startIndex, instanceProps);
    var maxOffset = scrollOffset + size;
    var offset = itemMetadata.offset + itemMetadata.size;
    var stopIndex = startIndex;
    while (stopIndex < itemCount - 1 && offset < maxOffset) {
      stopIndex++;
      offset += getItemMetadata$1(props, stopIndex, instanceProps).size;
    }
    return stopIndex;
  },
  initInstanceProps: function initInstanceProps(props, instance) {
    var _ref4 = props, estimatedItemSize = _ref4.estimatedItemSize;
    var instanceProps = {
      itemMetadataMap: {},
      estimatedItemSize: estimatedItemSize || DEFAULT_ESTIMATED_ITEM_SIZE$1,
      lastMeasuredIndex: -1
    };
    instance.resetAfterIndex = function(index, shouldForceUpdate) {
      if (shouldForceUpdate === void 0) {
        shouldForceUpdate = true;
      }
      instanceProps.lastMeasuredIndex = Math.min(instanceProps.lastMeasuredIndex, index - 1);
      instance._getItemStyleCache(-1);
      if (shouldForceUpdate) {
        instance.forceUpdate();
      }
    };
    return instanceProps;
  },
  shouldResetStyleCacheOnItemSizeChange: false,
  validateProps: function validateProps(_ref5) {
    var itemSize = _ref5.itemSize;
    if (false) {
      if (typeof itemSize !== "function") {
        throw Error('An invalid "itemSize" prop has been specified. Value should be a function. ' + ('"' + (itemSize === null ? "null" : typeof itemSize) + '" was specified.'));
      }
    }
  }
});
function shallowDiffers(prev, next) {
  for (var attribute in prev) {
    if (!(attribute in next)) {
      return true;
    }
  }
  for (var _attribute in next) {
    if (prev[_attribute] !== next[_attribute]) {
      return true;
    }
  }
  return false;
}
function areEqual(prevProps, nextProps) {
  var prevStyle = prevProps.style, prevRest = _objectWithoutPropertiesLoose(prevProps, ["style"]);
  var nextStyle = nextProps.style, nextRest = _objectWithoutPropertiesLoose(nextProps, ["style"]);
  return !shallowDiffers(prevStyle, nextStyle) && !shallowDiffers(prevRest, nextRest);
}

// src/client/components/List/List.tsx
var ScrollableWithRef = React7.forwardRef((props, ref) => /* @__PURE__ */ React7.createElement(Scrollable_default, {
  forwardedRef: ref,
  ...props
}));
var Render = (renderItem) => React7.memo((props) => {
  return /* @__PURE__ */ React7.createElement("div", {
    style: props.style,
    key: `vl-${props.index}`
  }, renderItem({index: props.index, data: props.data[props.index]}));
}, areEqual);
function VirtualList({
  items,
  itemSize,
  renderItem,
  ...props
}) {
  const listRef = React7.createRef();
  const outerRef = React7.createRef();
  const renderer = Render(renderItem);
  return /* @__PURE__ */ React7.createElement(index_esm_default, {
    defaultHeight: props.height,
    defaultWidth: props.width,
    disableHeight: Boolean(props.height),
    disableWidth: Boolean(props.width)
  }, ({height, width}) => {
    return /* @__PURE__ */ React7.createElement(VariableSizeList, {
      height: height || props.height || 500,
      width,
      itemCount: items.length,
      itemData: items,
      itemSize,
      outerRef,
      innerRef: listRef,
      outerElementType: ScrollableWithRef
    }, renderer);
  });
}
var List = React7.memo(VirtualList);
function MemoList(props) {
  return /* @__PURE__ */ React7.createElement(List, {
    ...props
  });
}
var List_default = MemoList;

// src/client/components/List/ListItem.tsx
import React8 from "https://cdn.skypack.dev/react";
var ButtonListItem = (props) => /* @__PURE__ */ React8.createElement(ListItem_default, {
  dense: true,
  ...props,
  button: true
});

// src/client/components/List/ListItemSecondaryAction.tsx
import React9 from "https://cdn.skypack.dev/react";
var ListItemSecondaryAction3 = (props) => /* @__PURE__ */ React9.createElement(ListItemSecondaryAction_default, {
  ...props
});

// src/client/components/List/ListItemText.tsx
import React10 from "https://cdn.skypack.dev/react";
var ListItemText3 = (props) => /* @__PURE__ */ React10.createElement(ListItemText_default, {
  ...props
});

export {
  React8 as React,
  ListContext_default,
  ButtonListItem,
  ListItemSecondaryAction3 as ListItemSecondaryAction,
  ListItemText3 as ListItemText,
  List_default,
  Typography_default,
  ListItem_default
};
//# sourceMappingURL=chunk.LEXKMBZU.js.map
