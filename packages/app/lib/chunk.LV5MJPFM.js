import {
  ButtonBase_default,
  capitalize,
  useForkRef,
  withStyles_default
} from "./chunk.YHRQBF35.js";
import {
  Ae,
  __toModule,
  _assertThisInitialized,
  _extends,
  _inheritsLoose,
  _objectWithoutProperties,
  _objectWithoutPropertiesLoose,
  clsx_m_default,
  require_prop_types,
  styled_components_browser_esm_default
} from "./chunk.GLASK65Q.js";

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
  var Component2 = componentProp || "li";
  if (button) {
    componentProps.component = componentProp || "div";
    componentProps.focusVisibleClassName = clsx_m_default(classes.focusVisible, focusVisibleClassName);
    Component2 = ButtonBase_default;
  }
  if (hasSecondaryAction) {
    Component2 = !componentProps.component && !componentProp ? "div" : Component2;
    if (ContainerComponent === "li") {
      if (Component2 === "li") {
        Component2 = "div";
      } else if (componentProps.component === "li") {
        componentProps.component = "div";
      }
    }
    return /* @__PURE__ */ createElement(ListContext_default.Provider, {
      value: childContext
    }, /* @__PURE__ */ createElement(ContainerComponent, _extends({
      className: clsx_m_default(classes.container, ContainerClassName),
      ref: handleRef
    }, ContainerProps), /* @__PURE__ */ createElement(Component2, componentProps, children), children.pop()));
  }
  return /* @__PURE__ */ createElement(ListContext_default.Provider, {
    value: childContext
  }, /* @__PURE__ */ createElement(Component2, _extends({
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
    for (var i3 = children.length - 1; i3 >= 0; i3 -= 1) {
      var child = children[i3];
      if (isMuiElement(child, ["ListItemSecondaryAction"])) {
        secondaryActionIndex = i3;
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
  var Component2 = component || (paragraph ? "p" : variantMapping[variant] || defaultVariantMapping[variant]) || "span";
  return /* @__PURE__ */ createElement3(Component2, _extends({
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
import React8 from "https://cdn.skypack.dev/react";

// ../../node_modules/memoize-one/dist/memoize-one.esm.js
function areInputsEqual(newInputs, lastInputs) {
  if (newInputs.length !== lastInputs.length) {
    return false;
  }
  for (var i3 = 0; i3 < newInputs.length; i3++) {
    if (newInputs[i3] !== lastInputs[i3]) {
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
        var style2;
        if (itemStyleCache.hasOwnProperty(index)) {
          style2 = itemStyleCache[index];
        } else {
          var _offset = getItemOffset2(_this.props, index, _this._instanceProps);
          var size = getItemSize2(_this.props, index, _this._instanceProps);
          var isHorizontal = direction === "horizontal" || layout === "horizontal";
          var isRtl = direction === "rtl";
          var offsetHorizontal = isHorizontal ? _offset : 0;
          itemStyleCache[index] = style2 = {
            position: "absolute",
            left: isRtl ? void 0 : offsetHorizontal,
            right: isRtl ? offsetHorizontal : void 0,
            top: !isHorizontal ? _offset : 0,
            height: !isHorizontal ? size : "100%",
            width: isHorizontal ? size : "100%"
          };
        }
        return style2;
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
      var _this$props4 = this.props, children = _this$props4.children, className = _this$props4.className, direction = _this$props4.direction, height = _this$props4.height, innerRef = _this$props4.innerRef, innerElementType = _this$props4.innerElementType, innerTagName = _this$props4.innerTagName, itemCount = _this$props4.itemCount, itemData = _this$props4.itemData, _this$props4$itemKey = _this$props4.itemKey, itemKey = _this$props4$itemKey === void 0 ? defaultItemKey$1 : _this$props4$itemKey, layout = _this$props4.layout, outerElementType = _this$props4.outerElementType, outerTagName = _this$props4.outerTagName, style2 = _this$props4.style, useIsScrolling = _this$props4.useIsScrolling, width = _this$props4.width;
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
        }, style2)
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
    for (var i3 = lastMeasuredIndex + 1; i3 <= index; i3++) {
      var size = itemSize(i3);
      itemMetadataMap[i3] = {
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

// ../../node_modules/react-virtualized-auto-sizer/dist/index.esm.js
import {createElement as createElement6, PureComponent as PureComponent2} from "https://cdn.skypack.dev/react";
function createDetectElementResize(nonce) {
  var _window;
  if (typeof window !== "undefined") {
    _window = window;
  } else if (typeof self !== "undefined") {
    _window = self;
  } else {
    _window = self;
  }
  var attachEvent = typeof document !== "undefined" && document.attachEvent;
  if (!attachEvent) {
    var requestFrame = function() {
      var raf = _window.requestAnimationFrame || _window.mozRequestAnimationFrame || _window.webkitRequestAnimationFrame || function(fn) {
        return _window.setTimeout(fn, 20);
      };
      return function(fn) {
        return raf(fn);
      };
    }();
    var cancelFrame = function() {
      var cancel = _window.cancelAnimationFrame || _window.mozCancelAnimationFrame || _window.webkitCancelAnimationFrame || _window.clearTimeout;
      return function(id) {
        return cancel(id);
      };
    }();
    var resetTriggers = function resetTriggers2(element) {
      var triggers = element.__resizeTriggers__, expand = triggers.firstElementChild, contract = triggers.lastElementChild, expandChild = expand.firstElementChild;
      contract.scrollLeft = contract.scrollWidth;
      contract.scrollTop = contract.scrollHeight;
      expandChild.style.width = expand.offsetWidth + 1 + "px";
      expandChild.style.height = expand.offsetHeight + 1 + "px";
      expand.scrollLeft = expand.scrollWidth;
      expand.scrollTop = expand.scrollHeight;
    };
    var checkTriggers = function checkTriggers2(element) {
      return element.offsetWidth != element.__resizeLast__.width || element.offsetHeight != element.__resizeLast__.height;
    };
    var scrollListener = function scrollListener2(e2) {
      if (e2.target.className && typeof e2.target.className.indexOf === "function" && e2.target.className.indexOf("contract-trigger") < 0 && e2.target.className.indexOf("expand-trigger") < 0) {
        return;
      }
      var element = this;
      resetTriggers(this);
      if (this.__resizeRAF__) {
        cancelFrame(this.__resizeRAF__);
      }
      this.__resizeRAF__ = requestFrame(function() {
        if (checkTriggers(element)) {
          element.__resizeLast__.width = element.offsetWidth;
          element.__resizeLast__.height = element.offsetHeight;
          element.__resizeListeners__.forEach(function(fn) {
            fn.call(element, e2);
          });
        }
      });
    };
    var animation = false, keyframeprefix = "", animationstartevent = "animationstart", domPrefixes = "Webkit Moz O ms".split(" "), startEvents = "webkitAnimationStart animationstart oAnimationStart MSAnimationStart".split(" "), pfx = "";
    {
      var elm = document.createElement("fakeelement");
      if (elm.style.animationName !== void 0) {
        animation = true;
      }
      if (animation === false) {
        for (var i3 = 0; i3 < domPrefixes.length; i3++) {
          if (elm.style[domPrefixes[i3] + "AnimationName"] !== void 0) {
            pfx = domPrefixes[i3];
            keyframeprefix = "-" + pfx.toLowerCase() + "-";
            animationstartevent = startEvents[i3];
            animation = true;
            break;
          }
        }
      }
    }
    var animationName = "resizeanim";
    var animationKeyframes = "@" + keyframeprefix + "keyframes " + animationName + " { from { opacity: 0; } to { opacity: 0; } } ";
    var animationStyle = keyframeprefix + "animation: 1ms " + animationName + "; ";
  }
  var createStyles = function createStyles2(doc2) {
    if (!doc2.getElementById("detectElementResize")) {
      var css = (animationKeyframes ? animationKeyframes : "") + ".resize-triggers { " + (animationStyle ? animationStyle : "") + 'visibility: hidden; opacity: 0; } .resize-triggers, .resize-triggers > div, .contract-trigger:before { content: " "; display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; z-index: -1; } .resize-triggers > div { background: #eee; overflow: auto; } .contract-trigger:before { width: 200%; height: 200%; }', head = doc2.head || doc2.getElementsByTagName("head")[0], style2 = doc2.createElement("style");
      style2.id = "detectElementResize";
      style2.type = "text/css";
      if (nonce != null) {
        style2.setAttribute("nonce", nonce);
      }
      if (style2.styleSheet) {
        style2.styleSheet.cssText = css;
      } else {
        style2.appendChild(doc2.createTextNode(css));
      }
      head.appendChild(style2);
    }
  };
  var addResizeListener = function addResizeListener2(element, fn) {
    if (attachEvent) {
      element.attachEvent("onresize", fn);
    } else {
      if (!element.__resizeTriggers__) {
        var doc2 = element.ownerDocument;
        var elementStyle = _window.getComputedStyle(element);
        if (elementStyle && elementStyle.position == "static") {
          element.style.position = "relative";
        }
        createStyles(doc2);
        element.__resizeLast__ = {};
        element.__resizeListeners__ = [];
        (element.__resizeTriggers__ = doc2.createElement("div")).className = "resize-triggers";
        var expandTrigger = doc2.createElement("div");
        expandTrigger.className = "expand-trigger";
        expandTrigger.appendChild(doc2.createElement("div"));
        var contractTrigger = doc2.createElement("div");
        contractTrigger.className = "contract-trigger";
        element.__resizeTriggers__.appendChild(expandTrigger);
        element.__resizeTriggers__.appendChild(contractTrigger);
        element.appendChild(element.__resizeTriggers__);
        resetTriggers(element);
        element.addEventListener("scroll", scrollListener, true);
        if (animationstartevent) {
          element.__resizeTriggers__.__animationListener__ = function animationListener(e2) {
            if (e2.animationName == animationName) {
              resetTriggers(element);
            }
          };
          element.__resizeTriggers__.addEventListener(animationstartevent, element.__resizeTriggers__.__animationListener__);
        }
      }
      element.__resizeListeners__.push(fn);
    }
  };
  var removeResizeListener = function removeResizeListener2(element, fn) {
    if (attachEvent) {
      element.detachEvent("onresize", fn);
    } else {
      element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
      if (!element.__resizeListeners__.length) {
        element.removeEventListener("scroll", scrollListener, true);
        if (element.__resizeTriggers__.__animationListener__) {
          element.__resizeTriggers__.removeEventListener(animationstartevent, element.__resizeTriggers__.__animationListener__);
          element.__resizeTriggers__.__animationListener__ = null;
        }
        try {
          element.__resizeTriggers__ = !element.removeChild(element.__resizeTriggers__);
        } catch (e2) {
        }
      }
    }
  };
  return {
    addResizeListener,
    removeResizeListener
  };
}
var classCallCheck = function(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
var createClass = function() {
  function defineProperties(target, props) {
    for (var i3 = 0; i3 < props.length; i3++) {
      var descriptor = props[i3];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor)
        descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function(Constructor, protoProps, staticProps) {
    if (protoProps)
      defineProperties(Constructor.prototype, protoProps);
    if (staticProps)
      defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();
var _extends2 = Object.assign || function(target) {
  for (var i3 = 1; i3 < arguments.length; i3++) {
    var source = arguments[i3];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
  return target;
};
var inherits = function(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass)
    Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};
var possibleConstructorReturn = function(self2, call) {
  if (!self2) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return call && (typeof call === "object" || typeof call === "function") ? call : self2;
};
var AutoSizer = function(_React$PureComponent) {
  inherits(AutoSizer2, _React$PureComponent);
  function AutoSizer2() {
    var _ref;
    var _temp, _this, _ret;
    classCallCheck(this, AutoSizer2);
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    return _ret = (_temp = (_this = possibleConstructorReturn(this, (_ref = AutoSizer2.__proto__ || Object.getPrototypeOf(AutoSizer2)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      height: _this.props.defaultHeight || 0,
      width: _this.props.defaultWidth || 0
    }, _this._onResize = function() {
      var _this$props = _this.props, disableHeight = _this$props.disableHeight, disableWidth = _this$props.disableWidth, onResize2 = _this$props.onResize;
      if (_this._parentNode) {
        var _height = _this._parentNode.offsetHeight || 0;
        var _width = _this._parentNode.offsetWidth || 0;
        var _style = window.getComputedStyle(_this._parentNode) || {};
        var paddingLeft = parseInt(_style.paddingLeft, 10) || 0;
        var paddingRight = parseInt(_style.paddingRight, 10) || 0;
        var paddingTop = parseInt(_style.paddingTop, 10) || 0;
        var paddingBottom = parseInt(_style.paddingBottom, 10) || 0;
        var newHeight = _height - paddingTop - paddingBottom;
        var newWidth = _width - paddingLeft - paddingRight;
        if (!disableHeight && _this.state.height !== newHeight || !disableWidth && _this.state.width !== newWidth) {
          _this.setState({
            height: _height - paddingTop - paddingBottom,
            width: _width - paddingLeft - paddingRight
          });
          onResize2({height: _height, width: _width});
        }
      }
    }, _this._setRef = function(autoSizer) {
      _this._autoSizer = autoSizer;
    }, _temp), possibleConstructorReturn(_this, _ret);
  }
  createClass(AutoSizer2, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      var nonce = this.props.nonce;
      if (this._autoSizer && this._autoSizer.parentNode && this._autoSizer.parentNode.ownerDocument && this._autoSizer.parentNode.ownerDocument.defaultView && this._autoSizer.parentNode instanceof this._autoSizer.parentNode.ownerDocument.defaultView.HTMLElement) {
        this._parentNode = this._autoSizer.parentNode;
        this._detectElementResize = createDetectElementResize(nonce);
        this._detectElementResize.addResizeListener(this._parentNode, this._onResize);
        this._onResize();
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      if (this._detectElementResize && this._parentNode) {
        this._detectElementResize.removeResizeListener(this._parentNode, this._onResize);
      }
    }
  }, {
    key: "render",
    value: function render() {
      var _props = this.props, children = _props.children, className = _props.className, disableHeight = _props.disableHeight, disableWidth = _props.disableWidth, style2 = _props.style;
      var _state = this.state, height = _state.height, width = _state.width;
      var outerStyle = {overflow: "visible"};
      var childParams = {};
      var bailoutOnChildren = false;
      if (!disableHeight) {
        if (height === 0) {
          bailoutOnChildren = true;
        }
        outerStyle.height = 0;
        childParams.height = height;
      }
      if (!disableWidth) {
        if (width === 0) {
          bailoutOnChildren = true;
        }
        outerStyle.width = 0;
        childParams.width = width;
      }
      return createElement6("div", {
        className,
        ref: this._setRef,
        style: _extends2({}, outerStyle, style2)
      }, !bailoutOnChildren && children(childParams));
    }
  }]);
  return AutoSizer2;
}(PureComponent2);
AutoSizer.defaultProps = {
  onResize: function onResize() {
  },
  disableHeight: false,
  disableWidth: false,
  style: {}
};
var index_esm_default = AutoSizer;

// src/client/components/Scrollable/Scrollable.tsx
import React7 from "https://cdn.skypack.dev/react";

// ../../node_modules/@babel/runtime/helpers/esm/getPrototypeOf.js
function _getPrototypeOf(o2) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf2(o3) {
    return o3.__proto__ || Object.getPrototypeOf(o3);
  };
  return _getPrototypeOf(o2);
}

// ../../node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function _setPrototypeOf(o2, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf2(o3, p2) {
    o3.__proto__ = p2;
    return o3;
  };
  return _setPrototypeOf(o2, p);
}

// ../../node_modules/@babel/runtime/helpers/esm/isNativeFunction.js
function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}

// ../../node_modules/@babel/runtime/helpers/esm/isNativeReflectConstruct.js
function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct)
    return false;
  if (Reflect.construct.sham)
    return false;
  if (typeof Proxy === "function")
    return true;
  try {
    Date.prototype.toString.call(Reflect.construct(Date, [], function() {
    }));
    return true;
  } catch (e2) {
    return false;
  }
}

// ../../node_modules/@babel/runtime/helpers/esm/construct.js
function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct2(Parent2, args2, Class2) {
      var a = [null];
      a.push.apply(a, args2);
      var Constructor = Function.bind.apply(Parent2, a);
      var instance = new Constructor();
      if (Class2)
        _setPrototypeOf(instance, Class2.prototype);
      return instance;
    };
  }
  return _construct.apply(null, arguments);
}

// ../../node_modules/@babel/runtime/helpers/esm/wrapNativeSuper.js
function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : void 0;
  _wrapNativeSuper = function _wrapNativeSuper2(Class2) {
    if (Class2 === null || !_isNativeFunction(Class2))
      return Class2;
    if (typeof Class2 !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }
    if (typeof _cache !== "undefined") {
      if (_cache.has(Class2))
        return _cache.get(Class2);
      _cache.set(Class2, Wrapper);
    }
    function Wrapper() {
      return _construct(Class2, arguments, _getPrototypeOf(this).constructor);
    }
    Wrapper.prototype = Object.create(Class2.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class2);
  };
  return _wrapNativeSuper(Class);
}

// ../../node_modules/polished/dist/polished.esm.js
var PolishedError = /* @__PURE__ */ function(_Error) {
  _inheritsLoose(PolishedError2, _Error);
  function PolishedError2(code) {
    var _this;
    if (true) {
      _this = _Error.call(this, "An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#" + code + " for more information.") || this;
    } else {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      _this = _Error.call(this, format.apply(void 0, [ERRORS[code]].concat(args))) || this;
    }
    return _assertThisInitialized(_this);
  }
  return PolishedError2;
}(/* @__PURE__ */ _wrapNativeSuper(Error));
function colorToInt(color) {
  return Math.round(color * 255);
}
function convertToInt(red, green, blue) {
  return colorToInt(red) + "," + colorToInt(green) + "," + colorToInt(blue);
}
function hslToRgb(hue, saturation, lightness, convert) {
  if (convert === void 0) {
    convert = convertToInt;
  }
  if (saturation === 0) {
    return convert(lightness, lightness, lightness);
  }
  var huePrime = (hue % 360 + 360) % 360 / 60;
  var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  var secondComponent = chroma * (1 - Math.abs(huePrime % 2 - 1));
  var red = 0;
  var green = 0;
  var blue = 0;
  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondComponent;
  } else if (huePrime >= 1 && huePrime < 2) {
    red = secondComponent;
    green = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    green = chroma;
    blue = secondComponent;
  } else if (huePrime >= 3 && huePrime < 4) {
    green = secondComponent;
    blue = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    red = secondComponent;
    blue = chroma;
  } else if (huePrime >= 5 && huePrime < 6) {
    red = chroma;
    blue = secondComponent;
  }
  var lightnessModification = lightness - chroma / 2;
  var finalRed = red + lightnessModification;
  var finalGreen = green + lightnessModification;
  var finalBlue = blue + lightnessModification;
  return convert(finalRed, finalGreen, finalBlue);
}
var namedColorMap = {
  aliceblue: "f0f8ff",
  antiquewhite: "faebd7",
  aqua: "00ffff",
  aquamarine: "7fffd4",
  azure: "f0ffff",
  beige: "f5f5dc",
  bisque: "ffe4c4",
  black: "000",
  blanchedalmond: "ffebcd",
  blue: "0000ff",
  blueviolet: "8a2be2",
  brown: "a52a2a",
  burlywood: "deb887",
  cadetblue: "5f9ea0",
  chartreuse: "7fff00",
  chocolate: "d2691e",
  coral: "ff7f50",
  cornflowerblue: "6495ed",
  cornsilk: "fff8dc",
  crimson: "dc143c",
  cyan: "00ffff",
  darkblue: "00008b",
  darkcyan: "008b8b",
  darkgoldenrod: "b8860b",
  darkgray: "a9a9a9",
  darkgreen: "006400",
  darkgrey: "a9a9a9",
  darkkhaki: "bdb76b",
  darkmagenta: "8b008b",
  darkolivegreen: "556b2f",
  darkorange: "ff8c00",
  darkorchid: "9932cc",
  darkred: "8b0000",
  darksalmon: "e9967a",
  darkseagreen: "8fbc8f",
  darkslateblue: "483d8b",
  darkslategray: "2f4f4f",
  darkslategrey: "2f4f4f",
  darkturquoise: "00ced1",
  darkviolet: "9400d3",
  deeppink: "ff1493",
  deepskyblue: "00bfff",
  dimgray: "696969",
  dimgrey: "696969",
  dodgerblue: "1e90ff",
  firebrick: "b22222",
  floralwhite: "fffaf0",
  forestgreen: "228b22",
  fuchsia: "ff00ff",
  gainsboro: "dcdcdc",
  ghostwhite: "f8f8ff",
  gold: "ffd700",
  goldenrod: "daa520",
  gray: "808080",
  green: "008000",
  greenyellow: "adff2f",
  grey: "808080",
  honeydew: "f0fff0",
  hotpink: "ff69b4",
  indianred: "cd5c5c",
  indigo: "4b0082",
  ivory: "fffff0",
  khaki: "f0e68c",
  lavender: "e6e6fa",
  lavenderblush: "fff0f5",
  lawngreen: "7cfc00",
  lemonchiffon: "fffacd",
  lightblue: "add8e6",
  lightcoral: "f08080",
  lightcyan: "e0ffff",
  lightgoldenrodyellow: "fafad2",
  lightgray: "d3d3d3",
  lightgreen: "90ee90",
  lightgrey: "d3d3d3",
  lightpink: "ffb6c1",
  lightsalmon: "ffa07a",
  lightseagreen: "20b2aa",
  lightskyblue: "87cefa",
  lightslategray: "789",
  lightslategrey: "789",
  lightsteelblue: "b0c4de",
  lightyellow: "ffffe0",
  lime: "0f0",
  limegreen: "32cd32",
  linen: "faf0e6",
  magenta: "f0f",
  maroon: "800000",
  mediumaquamarine: "66cdaa",
  mediumblue: "0000cd",
  mediumorchid: "ba55d3",
  mediumpurple: "9370db",
  mediumseagreen: "3cb371",
  mediumslateblue: "7b68ee",
  mediumspringgreen: "00fa9a",
  mediumturquoise: "48d1cc",
  mediumvioletred: "c71585",
  midnightblue: "191970",
  mintcream: "f5fffa",
  mistyrose: "ffe4e1",
  moccasin: "ffe4b5",
  navajowhite: "ffdead",
  navy: "000080",
  oldlace: "fdf5e6",
  olive: "808000",
  olivedrab: "6b8e23",
  orange: "ffa500",
  orangered: "ff4500",
  orchid: "da70d6",
  palegoldenrod: "eee8aa",
  palegreen: "98fb98",
  paleturquoise: "afeeee",
  palevioletred: "db7093",
  papayawhip: "ffefd5",
  peachpuff: "ffdab9",
  peru: "cd853f",
  pink: "ffc0cb",
  plum: "dda0dd",
  powderblue: "b0e0e6",
  purple: "800080",
  rebeccapurple: "639",
  red: "f00",
  rosybrown: "bc8f8f",
  royalblue: "4169e1",
  saddlebrown: "8b4513",
  salmon: "fa8072",
  sandybrown: "f4a460",
  seagreen: "2e8b57",
  seashell: "fff5ee",
  sienna: "a0522d",
  silver: "c0c0c0",
  skyblue: "87ceeb",
  slateblue: "6a5acd",
  slategray: "708090",
  slategrey: "708090",
  snow: "fffafa",
  springgreen: "00ff7f",
  steelblue: "4682b4",
  tan: "d2b48c",
  teal: "008080",
  thistle: "d8bfd8",
  tomato: "ff6347",
  turquoise: "40e0d0",
  violet: "ee82ee",
  wheat: "f5deb3",
  white: "fff",
  whitesmoke: "f5f5f5",
  yellow: "ff0",
  yellowgreen: "9acd32"
};
function nameToHex(color) {
  if (typeof color !== "string")
    return color;
  var normalizedColorName = color.toLowerCase();
  return namedColorMap[normalizedColorName] ? "#" + namedColorMap[normalizedColorName] : color;
}
var hexRegex = /^#[a-fA-F0-9]{6}$/;
var hexRgbaRegex = /^#[a-fA-F0-9]{8}$/;
var reducedHexRegex = /^#[a-fA-F0-9]{3}$/;
var reducedRgbaHexRegex = /^#[a-fA-F0-9]{4}$/;
var rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
var rgbaRegex = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([-+]?[0-9]*[.]?[0-9]+)\s*\)$/i;
var hslRegex = /^hsl\(\s*(\d{0,3}[.]?[0-9]+)\s*,\s*(\d{1,3}[.]?[0-9]?)%\s*,\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i;
var hslaRegex = /^hsla\(\s*(\d{0,3}[.]?[0-9]+)\s*,\s*(\d{1,3}[.]?[0-9]?)%\s*,\s*(\d{1,3}[.]?[0-9]?)%\s*,\s*([-+]?[0-9]*[.]?[0-9]+)\s*\)$/i;
function parseToRgb(color) {
  if (typeof color !== "string") {
    throw new PolishedError(3);
  }
  var normalizedColor = nameToHex(color);
  if (normalizedColor.match(hexRegex)) {
    return {
      red: parseInt("" + normalizedColor[1] + normalizedColor[2], 16),
      green: parseInt("" + normalizedColor[3] + normalizedColor[4], 16),
      blue: parseInt("" + normalizedColor[5] + normalizedColor[6], 16)
    };
  }
  if (normalizedColor.match(hexRgbaRegex)) {
    var alpha = parseFloat((parseInt("" + normalizedColor[7] + normalizedColor[8], 16) / 255).toFixed(2));
    return {
      red: parseInt("" + normalizedColor[1] + normalizedColor[2], 16),
      green: parseInt("" + normalizedColor[3] + normalizedColor[4], 16),
      blue: parseInt("" + normalizedColor[5] + normalizedColor[6], 16),
      alpha
    };
  }
  if (normalizedColor.match(reducedHexRegex)) {
    return {
      red: parseInt("" + normalizedColor[1] + normalizedColor[1], 16),
      green: parseInt("" + normalizedColor[2] + normalizedColor[2], 16),
      blue: parseInt("" + normalizedColor[3] + normalizedColor[3], 16)
    };
  }
  if (normalizedColor.match(reducedRgbaHexRegex)) {
    var _alpha = parseFloat((parseInt("" + normalizedColor[4] + normalizedColor[4], 16) / 255).toFixed(2));
    return {
      red: parseInt("" + normalizedColor[1] + normalizedColor[1], 16),
      green: parseInt("" + normalizedColor[2] + normalizedColor[2], 16),
      blue: parseInt("" + normalizedColor[3] + normalizedColor[3], 16),
      alpha: _alpha
    };
  }
  var rgbMatched = rgbRegex.exec(normalizedColor);
  if (rgbMatched) {
    return {
      red: parseInt("" + rgbMatched[1], 10),
      green: parseInt("" + rgbMatched[2], 10),
      blue: parseInt("" + rgbMatched[3], 10)
    };
  }
  var rgbaMatched = rgbaRegex.exec(normalizedColor);
  if (rgbaMatched) {
    return {
      red: parseInt("" + rgbaMatched[1], 10),
      green: parseInt("" + rgbaMatched[2], 10),
      blue: parseInt("" + rgbaMatched[3], 10),
      alpha: parseFloat("" + rgbaMatched[4])
    };
  }
  var hslMatched = hslRegex.exec(normalizedColor);
  if (hslMatched) {
    var hue = parseInt("" + hslMatched[1], 10);
    var saturation = parseInt("" + hslMatched[2], 10) / 100;
    var lightness = parseInt("" + hslMatched[3], 10) / 100;
    var rgbColorString = "rgb(" + hslToRgb(hue, saturation, lightness) + ")";
    var hslRgbMatched = rgbRegex.exec(rgbColorString);
    if (!hslRgbMatched) {
      throw new PolishedError(4, normalizedColor, rgbColorString);
    }
    return {
      red: parseInt("" + hslRgbMatched[1], 10),
      green: parseInt("" + hslRgbMatched[2], 10),
      blue: parseInt("" + hslRgbMatched[3], 10)
    };
  }
  var hslaMatched = hslaRegex.exec(normalizedColor);
  if (hslaMatched) {
    var _hue = parseInt("" + hslaMatched[1], 10);
    var _saturation = parseInt("" + hslaMatched[2], 10) / 100;
    var _lightness = parseInt("" + hslaMatched[3], 10) / 100;
    var _rgbColorString = "rgb(" + hslToRgb(_hue, _saturation, _lightness) + ")";
    var _hslRgbMatched = rgbRegex.exec(_rgbColorString);
    if (!_hslRgbMatched) {
      throw new PolishedError(4, normalizedColor, _rgbColorString);
    }
    return {
      red: parseInt("" + _hslRgbMatched[1], 10),
      green: parseInt("" + _hslRgbMatched[2], 10),
      blue: parseInt("" + _hslRgbMatched[3], 10),
      alpha: parseFloat("" + hslaMatched[4])
    };
  }
  throw new PolishedError(5);
}
function rgbToHsl(color) {
  var red = color.red / 255;
  var green = color.green / 255;
  var blue = color.blue / 255;
  var max = Math.max(red, green, blue);
  var min = Math.min(red, green, blue);
  var lightness = (max + min) / 2;
  if (max === min) {
    if (color.alpha !== void 0) {
      return {
        hue: 0,
        saturation: 0,
        lightness,
        alpha: color.alpha
      };
    } else {
      return {
        hue: 0,
        saturation: 0,
        lightness
      };
    }
  }
  var hue;
  var delta = max - min;
  var saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }
  hue *= 60;
  if (color.alpha !== void 0) {
    return {
      hue,
      saturation,
      lightness,
      alpha: color.alpha
    };
  }
  return {
    hue,
    saturation,
    lightness
  };
}
function parseToHsl(color) {
  return rgbToHsl(parseToRgb(color));
}
var reduceHexValue = function reduceHexValue2(value) {
  if (value.length === 7 && value[1] === value[2] && value[3] === value[4] && value[5] === value[6]) {
    return "#" + value[1] + value[3] + value[5];
  }
  return value;
};
function numberToHex(value) {
  var hex = value.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}
function colorToHex(color) {
  return numberToHex(Math.round(color * 255));
}
function convertToHex(red, green, blue) {
  return reduceHexValue("#" + colorToHex(red) + colorToHex(green) + colorToHex(blue));
}
function hslToHex(hue, saturation, lightness) {
  return hslToRgb(hue, saturation, lightness, convertToHex);
}
function hsl(value, saturation, lightness) {
  if (typeof value === "number" && typeof saturation === "number" && typeof lightness === "number") {
    return hslToHex(value, saturation, lightness);
  } else if (typeof value === "object" && saturation === void 0 && lightness === void 0) {
    return hslToHex(value.hue, value.saturation, value.lightness);
  }
  throw new PolishedError(1);
}
function hsla(value, saturation, lightness, alpha) {
  if (typeof value === "number" && typeof saturation === "number" && typeof lightness === "number" && typeof alpha === "number") {
    return alpha >= 1 ? hslToHex(value, saturation, lightness) : "rgba(" + hslToRgb(value, saturation, lightness) + "," + alpha + ")";
  } else if (typeof value === "object" && saturation === void 0 && lightness === void 0 && alpha === void 0) {
    return value.alpha >= 1 ? hslToHex(value.hue, value.saturation, value.lightness) : "rgba(" + hslToRgb(value.hue, value.saturation, value.lightness) + "," + value.alpha + ")";
  }
  throw new PolishedError(2);
}
function rgb(value, green, blue) {
  if (typeof value === "number" && typeof green === "number" && typeof blue === "number") {
    return reduceHexValue("#" + numberToHex(value) + numberToHex(green) + numberToHex(blue));
  } else if (typeof value === "object" && green === void 0 && blue === void 0) {
    return reduceHexValue("#" + numberToHex(value.red) + numberToHex(value.green) + numberToHex(value.blue));
  }
  throw new PolishedError(6);
}
function rgba(firstValue, secondValue, thirdValue, fourthValue) {
  if (typeof firstValue === "string" && typeof secondValue === "number") {
    var rgbValue = parseToRgb(firstValue);
    return "rgba(" + rgbValue.red + "," + rgbValue.green + "," + rgbValue.blue + "," + secondValue + ")";
  } else if (typeof firstValue === "number" && typeof secondValue === "number" && typeof thirdValue === "number" && typeof fourthValue === "number") {
    return fourthValue >= 1 ? rgb(firstValue, secondValue, thirdValue) : "rgba(" + firstValue + "," + secondValue + "," + thirdValue + "," + fourthValue + ")";
  } else if (typeof firstValue === "object" && secondValue === void 0 && thirdValue === void 0 && fourthValue === void 0) {
    return firstValue.alpha >= 1 ? rgb(firstValue.red, firstValue.green, firstValue.blue) : "rgba(" + firstValue.red + "," + firstValue.green + "," + firstValue.blue + "," + firstValue.alpha + ")";
  }
  throw new PolishedError(7);
}
var isRgb = function isRgb2(color) {
  return typeof color.red === "number" && typeof color.green === "number" && typeof color.blue === "number" && (typeof color.alpha !== "number" || typeof color.alpha === "undefined");
};
var isRgba = function isRgba2(color) {
  return typeof color.red === "number" && typeof color.green === "number" && typeof color.blue === "number" && typeof color.alpha === "number";
};
var isHsl = function isHsl2(color) {
  return typeof color.hue === "number" && typeof color.saturation === "number" && typeof color.lightness === "number" && (typeof color.alpha !== "number" || typeof color.alpha === "undefined");
};
var isHsla = function isHsla2(color) {
  return typeof color.hue === "number" && typeof color.saturation === "number" && typeof color.lightness === "number" && typeof color.alpha === "number";
};
function toColorString(color) {
  if (typeof color !== "object")
    throw new PolishedError(8);
  if (isRgba(color))
    return rgba(color);
  if (isRgb(color))
    return rgb(color);
  if (isHsla(color))
    return hsla(color);
  if (isHsl(color))
    return hsl(color);
  throw new PolishedError(8);
}
function curried(f2, length, acc) {
  return function fn() {
    var combined = acc.concat(Array.prototype.slice.call(arguments));
    return combined.length >= length ? f2.apply(this, combined) : curried(f2, length, combined);
  };
}
function curry(f2) {
  return curried(f2, f2.length, []);
}
function guard(lowerBoundary, upperBoundary, value) {
  return Math.max(lowerBoundary, Math.min(upperBoundary, value));
}
function darken(amount, color) {
  if (color === "transparent")
    return color;
  var hslColor = parseToHsl(color);
  return toColorString(_extends({}, hslColor, {
    lightness: guard(0, 1, hslColor.lightness - parseFloat(amount))
  }));
}
var curriedDarken = /* @__PURE__ */ curry(darken);
function lighten(amount, color) {
  if (color === "transparent")
    return color;
  var hslColor = parseToHsl(color);
  return toColorString(_extends({}, hslColor, {
    lightness: guard(0, 1, hslColor.lightness + parseFloat(amount))
  }));
}
var curriedLighten = /* @__PURE__ */ curry(lighten);

// ../../node_modules/cnbuilder/dist/index.esm.js
var r = Array.isArray;
var t = function(n2) {
  if (!n2)
    return "";
  if (typeof n2 == "string")
    return n2;
  if (typeof n2 != "object")
    return "";
  var e2, f2, i3 = "";
  if (r(n2)) {
    if ((f2 = n2.length) === 0)
      return "";
    if (f2 === 1)
      return t(n2[0]);
    for (var o2 = 0; o2 < f2; )
      (e2 = t(n2[o2++])) && (i3 += (i3 && " ") + e2);
    return i3;
  }
  for (e2 in n2)
    n2[e2] && e2 && (i3 += (i3 && " ") + e2);
  return i3;
};
function n() {
  var r2 = arguments.length;
  if (r2 === 0)
    return "";
  if (r2 === 1)
    return t(arguments[0]);
  for (var n2, e2 = 0, f2 = ""; e2 < r2; )
    (n2 = t(arguments[e2++])) && (f2 += (f2 && " ") + n2);
  return f2;
}
var f = Object.create;
var i = Array.isArray;
function o() {
}
o.prototype = f(null);

// ../../node_modules/react-scrollbars-custom/dist/rsc.esm.js
var import_prop_types5 = __toModule(require_prop_types());
import {createElement as createElement7, createRef, Component, createContext as createContext2} from "https://cdn.skypack.dev/react";

// ../../node_modules/zoom-level/dist/zoom-level.esm.js
function e(e2, i3, t2, o2) {
  for (; i3 >= t2 && !e2("(min-resolution: " + i3 / o2 + "dppx)").matches; )
    i3--;
  return i3;
}
function i2(i3) {
  if (i3 === void 0 && (i3 = window), !i3)
    return 1;
  if (i3.devicePixelRatio !== void 0)
    return i3.devicePixelRatio;
  var t2 = i3.document.frames;
  return t2 !== void 0 ? t2.devicePixelRatio !== void 0 ? t2.devicePixelRatio : t2.screen.deviceXDPI / t2.screen.systemXDPI : i3.matchMedia !== void 0 ? function(i4) {
    for (var t3 = i4.matchMedia, o2 = 10, n2 = 0.1, r2 = 1, a = o2, c = 0; c < 4; c++)
      o2 = (a = 10 * e(t3, o2, n2, r2)) + 9, n2 = a, r2 *= 10;
    return a / r2;
  }(i3) : 1;
}

// ../../node_modules/react-scrollbars-custom/dist/rsc.esm.js
import {DraggableCore} from "https://cdn.skypack.dev/react-draggable";
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || {__proto__: []} instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2)
      if (b2.hasOwnProperty(p))
        d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function() {
  __assign = Object.assign || function __assign2(t2) {
    for (var s, i3 = 1, n2 = arguments.length; i3 < n2; i3++) {
      s = arguments[i3];
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p))
          t2[p] = s[p];
    }
    return t2;
  };
  return __assign.apply(this, arguments);
};
function __rest(s, e2) {
  var t2 = {};
  for (var p in s)
    if (Object.prototype.hasOwnProperty.call(s, p) && e2.indexOf(p) < 0)
      t2[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i3 = 0, p = Object.getOwnPropertySymbols(s); i3 < p.length; i3++) {
      if (e2.indexOf(p[i3]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i3]))
        t2[p[i3]] = s[p[i3]];
    }
  return t2;
}
function __spreadArrays() {
  for (var s = 0, i3 = 0, il = arguments.length; i3 < il; i3++)
    s += arguments[i3].length;
  for (var r2 = Array(s), k = 0, i3 = 0; i3 < il; i3++)
    for (var a = arguments[i3], j = 0, jl = a.length; j < jl; j++, k++)
      r2[k] = a[j];
  return r2;
}
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}
var doc = (typeof document === "undefined" ? "undefined" : _typeof(document)) === "object" ? document : null;
var isUndef = function isUndef2(v) {
  return typeof v === "undefined";
};
var isFun = function isFun2(v) {
  return typeof v === "function";
};
var isNum = function isNum2(v) {
  return typeof v === "number";
};
var renderDivWithRenderer = function renderDivWithRenderer2(props, elementRef) {
  if (isFun(props.renderer)) {
    props.elementRef = elementRef;
    var renderer = props.renderer;
    delete props.renderer;
    return renderer(props);
  }
  delete props.elementRef;
  return createElement7("div", __assign({}, props, {
    ref: elementRef
  }));
};
var getInnerSize = function getInnerSize2(el, dimension, padding1, padding2) {
  var styles7 = getComputedStyle(el);
  if (styles7.boxSizing === "border-box") {
    return Math.max(0, (parseFloat(styles7[dimension]) || 0) - (parseFloat(styles7[padding1]) || 0) - (parseFloat(styles7[padding2]) || 0));
  }
  return parseFloat(styles7[dimension]) || 0;
};
var getInnerHeight = function getInnerHeight2(el) {
  return getInnerSize(el, "height", "paddingTop", "paddingBottom");
};
var getInnerWidth = function getInnerWidth2(el) {
  return getInnerSize(el, "width", "paddingLeft", "paddingRight");
};
var uuid = function uuid2() {
  var uuid3 = "";
  for (var i3 = 0; i3 < 32; i3++) {
    if (i3 === 8 || i3 === 20) {
      uuid3 += "-" + (Math.random() * 16 | 0).toString(16);
    } else if (i3 === 12) {
      uuid3 += "-4";
    } else if (i3 === 16) {
      uuid3 += "-" + (Math.random() * 16 | 0 & 3 | 8).toString(16);
    } else {
      uuid3 += (Math.random() * 16 | 0).toString(16);
    }
  }
  return uuid3;
};
var calcThumbSize = function calcThumbSize2(contentSize, viewportSize, trackSize, minimalSize, maximalSize) {
  if (viewportSize >= contentSize) {
    return 0;
  }
  var thumbSize = viewportSize / contentSize * trackSize;
  isNum(maximalSize) && (thumbSize = Math.min(maximalSize, thumbSize));
  isNum(minimalSize) && (thumbSize = Math.max(minimalSize, thumbSize));
  return thumbSize;
};
var calcThumbOffset = function calcThumbOffset2(contentSize, viewportSize, trackSize, thumbSize, scroll) {
  if (!scroll || !thumbSize || viewportSize >= contentSize) {
    return 0;
  }
  return (trackSize - thumbSize) * scroll / (contentSize - viewportSize);
};
var calcScrollForThumbOffset = function calcScrollForThumbOffset2(contentSize, viewportSize, trackSize, thumbSize, thumbOffset) {
  if (!thumbOffset || !thumbSize || viewportSize >= contentSize) {
    return 0;
  }
  return thumbOffset * (contentSize - viewportSize) / (trackSize - thumbSize);
};
var getScrollbarWidth = function getScrollbarWidth2(force) {
  if (force === void 0) {
    force = false;
  }
  if (!doc) {
    return getScrollbarWidth2._cache = 0;
  }
  if (!force && !isUndef(getScrollbarWidth2._cache)) {
    return getScrollbarWidth2._cache;
  }
  var el = doc.createElement("div");
  el.setAttribute("style", "position:absolute;width:100px;height:100px;top:-999px;left:-999px;overflow:scroll;");
  doc.body.appendChild(el);
  if (el.clientWidth === 0) {
    doc.body.removeChild(el);
    return;
  }
  getScrollbarWidth2._cache = 100 - el.clientWidth;
  doc.body.removeChild(el);
  return getScrollbarWidth2._cache;
};
var shouldReverseRtlScroll = function shouldReverseRtlScroll2(force) {
  if (force === void 0) {
    force = false;
  }
  if (!force && !isUndef(shouldReverseRtlScroll2._cache)) {
    return shouldReverseRtlScroll2._cache;
  }
  if (!doc) {
    return shouldReverseRtlScroll2._cache = false;
  }
  var el = doc.createElement("div");
  var child = doc.createElement("div");
  el.appendChild(child);
  el.setAttribute("style", "position:absolute;width:100px;height:100px;top:-999px;left:-999px;overflow:scroll;direction:rtl");
  child.setAttribute("style", "width:1000px;height:1000px");
  doc.body.appendChild(el);
  el.scrollLeft = -50;
  shouldReverseRtlScroll2._cache = el.scrollLeft === -50;
  doc.body.removeChild(el);
  return shouldReverseRtlScroll2._cache;
};
var Emittr = function() {
  function Emittr2(maxHandlers) {
    if (maxHandlers === void 0) {
      maxHandlers = 10;
    }
    this.setMaxHandlers(maxHandlers);
    this._handlers = Object.create(null);
  }
  Emittr2._callEventHandlers = function(emitter, handlers, args) {
    if (!handlers.length) {
      return;
    }
    if (handlers.length === 1) {
      Reflect.apply(handlers[0], emitter, args);
      return;
    }
    handlers = __spreadArrays(handlers);
    var idx;
    for (idx = 0; idx < handlers.length; idx++) {
      Reflect.apply(handlers[idx], emitter, args);
    }
  };
  Emittr2.prototype.setMaxHandlers = function(count) {
    if (!isNum(count) || count <= 0) {
      throw new TypeError("Expected maxHandlers to be a positive number, got '" + count + "' of type " + _typeof(count));
    }
    this._maxHandlers = count;
    return this;
  };
  Emittr2.prototype.getMaxHandlers = function() {
    return this._maxHandlers;
  };
  Emittr2.prototype.emit = function(name) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
      args[_i - 1] = arguments[_i];
    }
    if (_typeof(this._handlers[name]) !== "object" || !Array.isArray(this._handlers[name])) {
      return false;
    }
    Emittr2._callEventHandlers(this, this._handlers[name], args);
    return true;
  };
  Emittr2.prototype.on = function(name, handler) {
    Emittr2._addHandler(this, name, handler);
    return this;
  };
  Emittr2.prototype.prependOn = function(name, handler) {
    Emittr2._addHandler(this, name, handler, true);
    return this;
  };
  Emittr2.prototype.once = function(name, handler) {
    if (!isFun(handler)) {
      throw new TypeError("Expected event handler to be a function, got " + _typeof(handler));
    }
    Emittr2._addHandler(this, name, this._wrapOnceHandler(name, handler));
    return this;
  };
  Emittr2.prototype.prependOnce = function(name, handler) {
    if (!isFun(handler)) {
      throw new TypeError("Expected event handler to be a function, got " + _typeof(handler));
    }
    Emittr2._addHandler(this, name, this._wrapOnceHandler(name, handler), true);
    return this;
  };
  Emittr2.prototype.off = function(name, handler) {
    Emittr2._removeHandler(this, name, handler);
    return this;
  };
  Emittr2.prototype.removeAllHandlers = function() {
    var handlers = this._handlers;
    this._handlers = Object.create(null);
    var removeHandlers = handlers["removeHandler"];
    delete handlers["removeHandler"];
    var idx, eventName;
    for (eventName in handlers) {
      for (idx = handlers[eventName].length - 1; idx >= 0; idx--) {
        Emittr2._callEventHandlers(this, removeHandlers, [eventName, handlers[eventName][idx].handler || handlers[eventName][idx]]);
      }
    }
    return this;
  };
  Emittr2.prototype._wrapOnceHandler = function(name, handler) {
    var onceState = {
      fired: false,
      handler,
      wrappedHandler: void 0,
      emitter: this,
      event: name
    };
    var wrappedHandler = Emittr2._onceWrapper.bind(onceState);
    onceState.wrappedHandler = wrappedHandler;
    wrappedHandler.handler = handler;
    wrappedHandler.event = name;
    return wrappedHandler;
  };
  Emittr2._addHandler = function(emitter, name, handler, prepend) {
    if (prepend === void 0) {
      prepend = false;
    }
    if (!isFun(handler)) {
      throw new TypeError("Expected event handler to be a function, got " + _typeof(handler));
    }
    emitter._handlers[name] = emitter._handlers[name] || [];
    emitter.emit("addHandler", name, handler);
    prepend ? emitter._handlers[name].unshift(handler) : emitter._handlers[name].push(handler);
    return emitter;
  };
  Emittr2._onceWrapper = function _onceWrapper() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    if (!this.fired) {
      this.fired = true;
      this.emitter.off(this.event, this.wrappedHandler);
      Reflect.apply(this.handler, this.emitter, args);
    }
  };
  Emittr2._removeHandler = function(emitter, name, handler) {
    if (!isFun(handler)) {
      throw new TypeError("Expected event handler to be a function, got " + _typeof(handler));
    }
    if (isUndef(emitter._handlers[name]) || !emitter._handlers[name].length) {
      return emitter;
    }
    var idx = -1;
    if (emitter._handlers[name].length === 1) {
      if (emitter._handlers[name][0] === handler || emitter._handlers[name][0].handler === handler) {
        idx = 0;
        handler = emitter._handlers[name][0].handler || emitter._handlers[name][0];
      }
    } else {
      for (idx = emitter._handlers[name].length - 1; idx >= 0; idx--) {
        if (emitter._handlers[name][idx] === handler || emitter._handlers[name][idx].handler === handler) {
          handler = emitter._handlers[name][idx].handler || emitter._handlers[name][idx];
          break;
        }
      }
    }
    if (idx === -1) {
      return emitter;
    }
    idx === 0 ? emitter._handlers[name].shift() : emitter._handlers[name].splice(idx, 1);
    emitter.emit("removeHandler", name, handler);
    return emitter;
  };
  return Emittr2;
}();
var RAFLoop = function() {
  function RAFLoop2() {
    var _this = this;
    this.targets = [];
    this.animationFrameID = 0;
    this._isActive = false;
    this.start = function() {
      if (!_this._isActive && _this.targets.length) {
        _this._isActive = true;
        _this.animationFrameID && cancelAnimationFrame(_this.animationFrameID);
        _this.animationFrameID = requestAnimationFrame(_this.rafCallback);
      }
      return _this;
    };
    this.stop = function() {
      if (_this._isActive) {
        _this._isActive = false;
        _this.animationFrameID && cancelAnimationFrame(_this.animationFrameID);
        _this.animationFrameID = 0;
      }
      return _this;
    };
    this.addTarget = function(target, silent) {
      if (silent === void 0) {
        silent = false;
      }
      if (_this.targets.indexOf(target) === -1) {
        _this.targets.push(target);
        _this.targets.length === 1 && !silent && _this.start();
      }
      return _this;
    };
    this.removeTarget = function(target) {
      var idx = _this.targets.indexOf(target);
      if (idx !== -1) {
        _this.targets.splice(idx, 1);
        _this.targets.length === 0 && _this.stop();
      }
      return _this;
    };
    this.rafCallback = function() {
      if (!_this._isActive) {
        return 0;
      }
      for (var i3 = 0; i3 < _this.targets.length; i3++) {
        !_this.targets[i3]._unmounted && _this.targets[i3].update();
      }
      return _this.animationFrameID = requestAnimationFrame(_this.rafCallback);
    };
  }
  Object.defineProperty(RAFLoop2.prototype, "isActive", {
    get: function get() {
      return this._isActive;
    },
    enumerable: false,
    configurable: true
  });
  return RAFLoop2;
}();
var Loop = new RAFLoop();
var AXIS_DIRECTION;
(function(AXIS_DIRECTION2) {
  AXIS_DIRECTION2["X"] = "x";
  AXIS_DIRECTION2["Y"] = "y";
})(AXIS_DIRECTION || (AXIS_DIRECTION = {}));
var AXIS_DIRECTION_PROP_TYPE = import_prop_types5.oneOf([AXIS_DIRECTION.X, AXIS_DIRECTION.Y]);
var TRACK_CLICK_BEHAVIOR;
(function(TRACK_CLICK_BEHAVIOR2) {
  TRACK_CLICK_BEHAVIOR2["JUMP"] = "jump";
  TRACK_CLICK_BEHAVIOR2["STEP"] = "step";
})(TRACK_CLICK_BEHAVIOR || (TRACK_CLICK_BEHAVIOR = {}));
var TRACK_CLICK_BEHAVIOR_PROP_TYPE = import_prop_types5.oneOf([TRACK_CLICK_BEHAVIOR.JUMP, TRACK_CLICK_BEHAVIOR.STEP]);
var ScrollbarThumb = function(_super) {
  __extends(ScrollbarThumb2, _super);
  function ScrollbarThumb2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.initialOffsetX = 0;
    _this.initialOffsetY = 0;
    _this.lastDragData = {
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: 0,
      lastX: 0,
      lastY: 0
    };
    _this.element = null;
    _this.handleOnDragStart = function(ev, data) {
      if (!_this.element) {
        _this.handleOnDragStop(ev, data);
        return;
      }
      if (self.document) {
        _this.prevUserSelect = self.document.body.style.userSelect;
        self.document.body.style.userSelect = "none";
        _this.prevOnSelectStart = self.document.onselectstart;
        self.document.onselectstart = ScrollbarThumb2.selectStartReplacer;
      }
      _this.props.onDragStart && _this.props.onDragStart(_this.lastDragData = {
        x: data.x - _this.initialOffsetX,
        y: data.y - _this.initialOffsetY,
        lastX: data.lastX - _this.initialOffsetX,
        lastY: data.lastY - _this.initialOffsetY,
        deltaX: data.deltaX,
        deltaY: data.deltaY
      });
      _this.element.classList.add("dragging");
    };
    _this.handleOnDrag = function(ev, data) {
      if (!_this.element) {
        _this.handleOnDragStop(ev, data);
        return;
      }
      _this.props.onDrag && _this.props.onDrag(_this.lastDragData = {
        x: data.x - _this.initialOffsetX,
        y: data.y - _this.initialOffsetY,
        lastX: data.lastX - _this.initialOffsetX,
        lastY: data.lastY - _this.initialOffsetY,
        deltaX: data.deltaX,
        deltaY: data.deltaY
      });
    };
    _this.handleOnDragStop = function(ev, data) {
      var resultData = data ? {
        x: data.x - _this.initialOffsetX,
        y: data.y - _this.initialOffsetY,
        lastX: data.lastX - _this.initialOffsetX,
        lastY: data.lastY - _this.initialOffsetY,
        deltaX: data.deltaX,
        deltaY: data.deltaY
      } : _this.lastDragData;
      _this.props.onDragEnd && _this.props.onDragEnd(resultData);
      _this.element && _this.element.classList.remove("dragging");
      if (self.document) {
        self.document.body.style.userSelect = _this.prevUserSelect;
        self.document.onselectstart = _this.prevOnSelectStart;
        _this.prevOnSelectStart = null;
      }
      _this.initialOffsetX = 0;
      _this.initialOffsetY = 0;
      _this.lastDragData = {
        x: 0,
        y: 0,
        deltaX: 0,
        deltaY: 0,
        lastX: 0,
        lastY: 0
      };
    };
    _this.handleOnMouseDown = function(ev) {
      if (!_this.element) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (!isUndef(ev.offsetX)) {
        _this.initialOffsetX = ev.offsetX;
        _this.initialOffsetY = ev.offsetY;
      } else {
        var rect = _this.element.getBoundingClientRect();
        _this.initialOffsetX = (ev.clientX || ev.touches[0].clientX) - rect.left;
        _this.initialOffsetY = (ev.clientY || ev.touches[0].clientY) - rect.top;
      }
    };
    _this.elementRefHack = createRef();
    _this.elementRef = function(ref) {
      isFun(_this.props.elementRef) && _this.props.elementRef(ref);
      _this.element = ref;
      _this.elementRefHack["current"] = ref;
    };
    return _this;
  }
  ScrollbarThumb2.prototype.componentDidMount = function() {
    if (!this.element) {
      this.setState(function() {
        throw new Error("<ScrollbarThumb> Element was not created. Possibly you haven't provided HTMLDivElement to renderer's `elementRef` function.");
      });
      return;
    }
  };
  ScrollbarThumb2.prototype.componentWillUnmount = function() {
    this.handleOnDragStop();
    this.elementRef(null);
  };
  ScrollbarThumb2.prototype.render = function() {
    var _a = this.props, elementRef = _a.elementRef, axis = _a.axis, onDrag = _a.onDrag, onDragEnd = _a.onDragEnd, onDragStart = _a.onDragStart, props = __rest(_a, ["elementRef", "axis", "onDrag", "onDragEnd", "onDragStart"]);
    props.className = n("ScrollbarsCustom-Thumb", axis === AXIS_DIRECTION.X ? "ScrollbarsCustom-ThumbX" : "ScrollbarsCustom-ThumbY", props.className);
    if (props.renderer) {
      props.axis = axis;
    }
    return createElement7(DraggableCore, {
      allowAnyClick: false,
      enableUserSelectHack: false,
      onMouseDown: this.handleOnMouseDown,
      onDrag: this.handleOnDrag,
      onStart: this.handleOnDragStart,
      onStop: this.handleOnDragStop,
      nodeRef: this.elementRefHack
    }, renderDivWithRenderer(props, this.elementRef));
  };
  ScrollbarThumb2.propTypes = {
    axis: AXIS_DIRECTION_PROP_TYPE,
    onDrag: import_prop_types5.func,
    onDragStart: import_prop_types5.func,
    onDragEnd: import_prop_types5.func,
    elementRef: import_prop_types5.func,
    renderer: import_prop_types5.func
  };
  ScrollbarThumb2.selectStartReplacer = function() {
    return false;
  };
  return ScrollbarThumb2;
}(Component);
var ScrollbarTrack = function(_super) {
  __extends(ScrollbarTrack2, _super);
  function ScrollbarTrack2() {
    var _this = _super !== null && _super.apply(this, arguments) || this;
    _this.element = null;
    _this.elementRef = function(ref) {
      isFun(_this.props.elementRef) && _this.props.elementRef(ref);
      _this.element = ref;
    };
    _this.handleClick = function(ev) {
      if (!ev || !_this.element || ev.button !== 0) {
        return;
      }
      if (isFun(_this.props.onClick) && ev.target === _this.element) {
        if (!isUndef(ev.offsetX)) {
          _this.props.onClick(ev, {
            axis: _this.props.axis,
            offset: _this.props.axis === AXIS_DIRECTION.X ? ev.offsetX : ev.offsetY
          });
        } else {
          var rect = _this.element.getBoundingClientRect();
          _this.props.onClick(ev, {
            axis: _this.props.axis,
            offset: _this.props.axis === AXIS_DIRECTION.X ? (ev.clientX || ev.touches[0].clientX) - rect.left : (ev.clientY || ev.touches[0].clientY) - rect.top
          });
        }
      }
      return true;
    };
    return _this;
  }
  ScrollbarTrack2.prototype.componentDidMount = function() {
    if (!this.element) {
      this.setState(function() {
        throw new Error("Element was not created. Possibly you haven't provided HTMLDivElement to renderer's `elementRef` function.");
      });
      return;
    }
    this.element.addEventListener("click", this.handleClick);
  };
  ScrollbarTrack2.prototype.componentWillUnmount = function() {
    if (this.element) {
      this.element.removeEventListener("click", this.handleClick);
      this.element = null;
      this.elementRef(null);
    }
  };
  ScrollbarTrack2.prototype.render = function() {
    var _a = this.props, elementRef = _a.elementRef, axis = _a.axis, onClick = _a.onClick, props = __rest(_a, ["elementRef", "axis", "onClick"]);
    props.className = n("ScrollbarsCustom-Track", axis === AXIS_DIRECTION.X ? "ScrollbarsCustom-TrackX" : "ScrollbarsCustom-TrackY", props.className);
    if (props.renderer) {
      props.axis = axis;
    }
    return renderDivWithRenderer(props, this.elementRef);
  };
  ScrollbarTrack2.propTypes = {
    axis: AXIS_DIRECTION_PROP_TYPE,
    onClick: import_prop_types5.func,
    elementRef: import_prop_types5.func,
    renderer: import_prop_types5.func
  };
  return ScrollbarTrack2;
}(Component);
var style = {
  holder: {
    position: "relative",
    width: "100%",
    height: "100%"
  },
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0
  },
  content: {
    boxSizing: "border-box"
  },
  track: {
    common: {
      position: "absolute",
      overflow: "hidden",
      borderRadius: 4,
      background: "rgba(0,0,0,.1)",
      userSelect: "none"
    },
    x: {
      height: 10,
      width: "calc(100% - 20px)",
      bottom: 0,
      left: 10
    },
    y: {
      width: 10,
      height: "calc(100% - 20px)",
      top: 10
    }
  },
  thumb: {
    common: {
      cursor: "pointer",
      borderRadius: 4,
      background: "rgba(0,0,0,.4)"
    },
    x: {
      height: "100%",
      width: 0
    },
    y: {
      width: "100%",
      height: 0
    }
  }
};
var pageZoomLevel = self.window ? i2() : 1;
self.window && self.window.addEventListener("resize", function() {
  return pageZoomLevel = i2();
}, {
  passive: true
});
var ScrollbarContext = createContext2({
  parentScrollbar: null
});
var Scrollbar = function(_super) {
  __extends(Scrollbar2, _super);
  function Scrollbar2(props) {
    var _this = _super.call(this, props) || this;
    _this.getScrollState = function(force) {
      if (force === void 0) {
        force = false;
      }
      if (_this.scrollValues && !force) {
        return __assign({}, _this.scrollValues);
      }
      var scrollState = {
        clientHeight: 0,
        clientWidth: 0,
        contentScrollHeight: 0,
        contentScrollWidth: 0,
        scrollHeight: 0,
        scrollWidth: 0,
        scrollTop: 0,
        scrollLeft: 0,
        scrollYBlocked: false,
        scrollXBlocked: false,
        scrollYPossible: false,
        scrollXPossible: false,
        trackYVisible: false,
        trackXVisible: false,
        zoomLevel: pageZoomLevel * 1,
        isRTL: void 0
      };
      var props2 = _this.props;
      scrollState.isRTL = _this.state.isRTL;
      scrollState.scrollYBlocked = props2.noScroll || props2.noScrollY;
      scrollState.scrollXBlocked = props2.noScroll || props2.noScrollX;
      if (_this.scrollerElement) {
        scrollState.clientHeight = _this.scrollerElement.clientHeight;
        scrollState.clientWidth = _this.scrollerElement.clientWidth;
        scrollState.scrollHeight = _this.scrollerElement.scrollHeight;
        scrollState.scrollWidth = _this.scrollerElement.scrollWidth;
        scrollState.scrollTop = _this.scrollerElement.scrollTop;
        scrollState.scrollLeft = _this.scrollerElement.scrollLeft;
        scrollState.scrollYPossible = !scrollState.scrollYBlocked && scrollState.scrollHeight > scrollState.clientHeight;
        scrollState.scrollXPossible = !scrollState.scrollXBlocked && scrollState.scrollWidth > scrollState.clientWidth;
        scrollState.trackYVisible = scrollState.scrollYPossible || props2.permanentTracks || props2.permanentTrackY;
        scrollState.trackXVisible = scrollState.scrollXPossible || props2.permanentTracks || props2.permanentTrackX;
      }
      if (_this.contentElement) {
        scrollState.contentScrollHeight = _this.contentElement.scrollHeight;
        scrollState.contentScrollWidth = _this.contentElement.scrollWidth;
      }
      return scrollState;
    };
    _this.scrollToTop = function() {
      if (_this.scrollerElement) {
        _this.scrollerElement.scrollTop = 0;
      }
      return _this;
    };
    _this.scrollToLeft = function() {
      if (_this.scrollerElement) {
        _this.scrollerElement.scrollLeft = 0;
      }
      return _this;
    };
    _this.scrollToBottom = function() {
      if (_this.scrollerElement) {
        _this.scrollerElement.scrollTop = _this.scrollerElement.scrollHeight - _this.scrollerElement.clientHeight;
      }
      return _this;
    };
    _this.scrollToRight = function() {
      if (_this.scrollerElement) {
        _this.scrollerElement.scrollLeft = _this.scrollerElement.scrollWidth - _this.scrollerElement.clientWidth;
      }
      return _this;
    };
    _this.scrollTo = function(x, y) {
      if (_this.scrollerElement) {
        isNum(x) && (_this.scrollerElement.scrollLeft = x);
        isNum(y) && (_this.scrollerElement.scrollTop = y);
      }
      return _this;
    };
    _this.centerAt = function(x, y) {
      if (_this.scrollerElement) {
        isNum(x) && (_this.scrollerElement.scrollLeft = x - _this.scrollerElement.clientWidth / 2);
        isNum(y) && (_this.scrollerElement.scrollTop = y - _this.scrollerElement.clientHeight / 2);
      }
      return _this;
    };
    _this.update = function(force) {
      if (force === void 0) {
        force = false;
      }
      if (!_this.scrollerElement) {
        return;
      }
      if (isUndef(_this.state.isRTL)) {
        _this.setState({
          isRTL: getComputedStyle(_this.scrollerElement).direction === "rtl"
        });
        return _this.getScrollState();
      }
      var scrollState = _this.getScrollState(true);
      var prevScrollState = __assign({}, _this.scrollValues);
      var props2 = _this.props;
      var bitmask = 0;
      if (!force) {
        prevScrollState.clientHeight !== scrollState.clientHeight && (bitmask |= 1 << 0);
        prevScrollState.clientWidth !== scrollState.clientWidth && (bitmask |= 1 << 1);
        prevScrollState.scrollHeight !== scrollState.scrollHeight && (bitmask |= 1 << 2);
        prevScrollState.scrollWidth !== scrollState.scrollWidth && (bitmask |= 1 << 3);
        prevScrollState.scrollTop !== scrollState.scrollTop && (bitmask |= 1 << 4);
        prevScrollState.scrollLeft !== scrollState.scrollLeft && (bitmask |= 1 << 5);
        prevScrollState.scrollYBlocked !== scrollState.scrollYBlocked && (bitmask |= 1 << 6);
        prevScrollState.scrollXBlocked !== scrollState.scrollXBlocked && (bitmask |= 1 << 7);
        prevScrollState.scrollYPossible !== scrollState.scrollYPossible && (bitmask |= 1 << 8);
        prevScrollState.scrollXPossible !== scrollState.scrollXPossible && (bitmask |= 1 << 9);
        prevScrollState.trackYVisible !== scrollState.trackYVisible && (bitmask |= 1 << 10);
        prevScrollState.trackXVisible !== scrollState.trackXVisible && (bitmask |= 1 << 11);
        prevScrollState.isRTL !== scrollState.isRTL && (bitmask |= 1 << 12);
        prevScrollState.contentScrollHeight !== scrollState.contentScrollHeight && (bitmask |= 1 << 13);
        prevScrollState.contentScrollWidth !== scrollState.contentScrollWidth && (bitmask |= 1 << 14);
        prevScrollState.zoomLevel !== scrollState.zoomLevel && (bitmask |= 1 << 15);
        if (bitmask === 0) {
          return prevScrollState;
        }
      } else {
        bitmask = 32767;
      }
      if (!props2.native && _this.holderElement) {
        if (bitmask & 1 << 13 && (props2.translateContentSizesToHolder || props2.translateContentSizeYToHolder)) {
          _this.holderElement.style.height = scrollState.contentScrollHeight + "px";
        }
        if (bitmask & 1 << 14 && (props2.translateContentSizesToHolder || props2.translateContentSizeXToHolder)) {
          _this.holderElement.style.width = scrollState.contentScrollWidth + "px";
        }
        if (props2.translateContentSizesToHolder || props2.translateContentSizeYToHolder || props2.translateContentSizeXToHolder) {
          if (!scrollState.clientHeight && scrollState.contentScrollHeight || !scrollState.clientWidth && scrollState.contentScrollWidth) {
            return;
          }
        }
      }
      if (bitmask & 1 << 10 || bitmask & 1 << 11) {
        prevScrollState.scrollYBlocked = scrollState.scrollYBlocked;
        prevScrollState.scrollXBlocked = scrollState.scrollXBlocked;
        prevScrollState.scrollYPossible = scrollState.scrollYPossible;
        prevScrollState.scrollXPossible = scrollState.scrollXPossible;
        if (_this.trackYElement && bitmask & 1 << 10) {
          _this.trackYElement.style.display = scrollState.trackYVisible ? "" : "none";
        }
        if (_this.trackXElement && bitmask & 1 << 11) {
          _this.trackXElement.style.display = scrollState.trackXVisible ? "" : "none";
        }
        _this.scrollValues = prevScrollState;
        _this.setState({
          trackYVisible: _this.scrollValues.trackYVisible = scrollState.trackYVisible,
          trackXVisible: _this.scrollValues.trackXVisible = scrollState.trackXVisible
        });
        return;
      }
      (props2.native ? _this.updaterNative : _this.updaterCustom)(bitmask, scrollState);
      _this.scrollValues = scrollState;
      if (!props2.native && bitmask & 1 << 15) {
        getScrollbarWidth(true);
        _this.forceUpdate();
      }
      _this.eventEmitter.emit("update", __assign({}, scrollState), prevScrollState);
      (bitmask & 1 << 4 || bitmask & 1 << 5) && _this.eventEmitter.emit("scroll", __assign({}, scrollState), prevScrollState);
      return _this.scrollValues;
    };
    _this.updaterNative = function() {
      return true;
    };
    _this.updaterCustom = function(bitmask, scrollValues) {
      var props2 = _this.props;
      if (_this.trackYElement) {
        if (_this.thumbYElement && (bitmask & 1 << 0 || bitmask & 1 << 2 || bitmask & 1 << 4 || bitmask & 1 << 6 || bitmask & 1 << 8)) {
          if (scrollValues.scrollYPossible) {
            var trackInnerSize = getInnerHeight(_this.trackYElement);
            var thumbSize = calcThumbSize(scrollValues.scrollHeight, scrollValues.clientHeight, trackInnerSize, props2.minimalThumbYSize || props2.minimalThumbSize, props2.maximalThumbYSize || props2.maximalThumbSize);
            var thumbOffset = calcThumbOffset(scrollValues.scrollHeight, scrollValues.clientHeight, trackInnerSize, thumbSize, scrollValues.scrollTop);
            _this.thumbYElement.style.transform = "translateY(" + thumbOffset + "px)";
            _this.thumbYElement.style.height = thumbSize + "px";
            _this.thumbYElement.style.display = "";
          } else {
            _this.thumbYElement.style.transform = "";
            _this.thumbYElement.style.height = "0px";
            _this.thumbYElement.style.display = "none";
          }
        }
      }
      if (_this.trackXElement) {
        if (_this.thumbXElement && (bitmask & 1 << 1 || bitmask & 1 << 3 || bitmask & 1 << 5 || bitmask & 1 << 7 || bitmask & 1 << 9 || bitmask & 1 << 12)) {
          if (scrollValues.scrollXPossible) {
            var trackInnerSize = getInnerWidth(_this.trackXElement);
            var thumbSize = calcThumbSize(scrollValues.scrollWidth, scrollValues.clientWidth, trackInnerSize, props2.minimalThumbXSize || props2.minimalThumbSize, props2.maximalThumbXSize || props2.maximalThumbSize);
            var thumbOffset = calcThumbOffset(scrollValues.scrollWidth, scrollValues.clientWidth, trackInnerSize, thumbSize, scrollValues.scrollLeft);
            if (_this.state.isRTL && shouldReverseRtlScroll()) {
              thumbOffset += trackInnerSize - thumbSize;
            }
            _this.thumbXElement.style.transform = "translateX(" + thumbOffset + "px)";
            _this.thumbXElement.style.width = thumbSize + "px";
            _this.thumbXElement.style.display = "";
          } else {
            _this.thumbXElement.style.transform = "";
            _this.thumbXElement.style.width = "0px";
            _this.thumbXElement.style.display = "none";
          }
        }
      }
      return true;
    };
    _this.elementRefHolder = function(ref) {
      _this.holderElement = ref;
      isFun(_this.props.elementRef) && _this.props.elementRef(ref);
    };
    _this.elementRefWrapper = function(ref) {
      _this.wrapperElement = ref;
      isFun(_this.props.wrapperProps.elementRef) && _this.props.wrapperProps.elementRef(ref);
    };
    _this.elementRefScroller = function(ref) {
      _this.scrollerElement = ref;
      isFun(_this.props.scrollerProps.elementRef) && _this.props.scrollerProps.elementRef(ref);
    };
    _this.elementRefContent = function(ref) {
      _this.contentElement = ref;
      isFun(_this.props.contentProps.elementRef) && _this.props.contentProps.elementRef(ref);
    };
    _this.elementRefTrackX = function(ref) {
      _this.trackXElement = ref;
      isFun(_this.props.trackXProps.elementRef) && _this.props.trackXProps.elementRef(ref);
    };
    _this.elementRefTrackY = function(ref) {
      _this.trackYElement = ref;
      isFun(_this.props.trackYProps.elementRef) && _this.props.trackYProps.elementRef(ref);
    };
    _this.elementRefThumbX = function(ref) {
      _this.thumbXElement = ref;
      isFun(_this.props.thumbXProps.elementRef) && _this.props.thumbXProps.elementRef(ref);
    };
    _this.elementRefThumbY = function(ref) {
      _this.thumbYElement = ref;
      isFun(_this.props.thumbYProps.elementRef) && _this.props.thumbYProps.elementRef(ref);
    };
    _this.handleTrackXClick = function(ev, values) {
      _this.props.trackXProps.onClick && _this.props.trackXProps.onClick(ev, values);
      if (!_this.scrollerElement || !_this.trackXElement || !_this.thumbXElement || !_this.scrollValues || !_this.scrollValues.scrollXPossible) {
        return;
      }
      _this._scrollDetection();
      var thumbSize = _this.thumbXElement.clientWidth;
      var trackInnerSize = getInnerWidth(_this.trackXElement);
      var thumbOffset = (_this.scrollValues.isRTL && shouldReverseRtlScroll() ? values.offset + thumbSize / 2 - trackInnerSize : values.offset - thumbSize / 2) - (parseFloat(getComputedStyle(_this.trackXElement).paddingLeft) || 0);
      var target = calcScrollForThumbOffset(_this.scrollValues.scrollWidth, _this.scrollValues.clientWidth, trackInnerSize, thumbSize, thumbOffset);
      if (_this.props.trackClickBehavior === TRACK_CLICK_BEHAVIOR.STEP) {
        target = (_this.scrollValues.isRTL ? _this.scrollValues.scrollLeft > target : _this.scrollValues.scrollLeft < target) ? _this.scrollValues.scrollLeft + _this.scrollValues.clientWidth : _this.scrollValues.scrollLeft - _this.scrollValues.clientWidth;
      }
      _this.scrollerElement.scrollLeft = target;
    };
    _this.handleTrackYClick = function(ev, values) {
      _this.props.trackYProps.onClick && _this.props.trackYProps.onClick(ev, values);
      if (!_this.scrollerElement || !_this.trackYElement || !_this.thumbYElement || !_this.scrollValues || !_this.scrollValues.scrollYPossible) {
        return;
      }
      _this._scrollDetection();
      var thumbSize = _this.thumbYElement.clientHeight;
      var target = calcScrollForThumbOffset(_this.scrollValues.scrollHeight, _this.scrollValues.clientHeight, getInnerHeight(_this.trackYElement), thumbSize, values.offset - thumbSize / 2) - (parseFloat(getComputedStyle(_this.trackYElement).paddingTop) || 0);
      if (_this.props.trackClickBehavior === TRACK_CLICK_BEHAVIOR.JUMP) {
        _this.scrollerElement.scrollTop = target;
      } else {
        _this.scrollerElement.scrollTop = _this.scrollValues.scrollTop < target ? _this.scrollValues.scrollTop + _this.scrollValues.clientHeight : _this.scrollValues.scrollTop - _this.scrollValues.clientHeight;
      }
    };
    _this.handleTrackYMouseWheel = function(ev) {
      var props2 = _this.props;
      props2.trackYProps && props2.trackYProps.onWheel && props2.trackYProps.onWheel(ev);
      if (props2.disableTracksMousewheelScrolling || props2.disableTrackYMousewheelScrolling) {
        return;
      }
      _this._scrollDetection();
      if (!_this.scrollerElement || _this.scrollValues.scrollYBlocked) {
        return;
      }
      _this.scrollTop += ev.deltaY;
    };
    _this.handleTrackXMouseWheel = function(ev) {
      var props2 = _this.props;
      props2.trackXProps && props2.trackXProps.onWheel && props2.trackXProps.onWheel(ev);
      if (props2.disableTracksMousewheelScrolling || props2.disableTrackXMousewheelScrolling) {
        return;
      }
      _this._scrollDetection();
      if (!_this.scrollerElement || _this.scrollValues.scrollXBlocked) {
        return;
      }
      _this.scrollLeft += ev.deltaX;
    };
    _this.handleThumbXDrag = function(data) {
      var _a;
      if (!_this.trackXElement || !_this.thumbXElement || !_this.scrollerElement || !_this.scrollValues || !_this.scrollValues.scrollXPossible) {
        return;
      }
      _this._scrollDetection();
      var trackRect = _this.trackXElement.getBoundingClientRect();
      var styles7 = getComputedStyle(_this.trackXElement);
      var paddingLeft = parseFloat(styles7.paddingLeft) || 0;
      var paddingRight = parseFloat(styles7.paddingRight) || 0;
      var trackInnerSize = trackRect.width - paddingLeft - paddingRight;
      var thumbSize = _this.thumbXElement.clientWidth;
      var offset = _this.scrollValues.isRTL && shouldReverseRtlScroll() ? data.x + thumbSize - trackInnerSize + paddingLeft : data.lastX - paddingLeft;
      _this.scrollerElement.scrollLeft = calcScrollForThumbOffset(_this.scrollValues.scrollWidth, _this.scrollValues.clientWidth, trackInnerSize, thumbSize, offset);
      if ((_a = _this.props.thumbXProps) === null || _a === void 0 ? void 0 : _a.onDrag) {
        _this.props.thumbXProps.onDrag(data);
      }
    };
    _this.handleThumbXDragEnd = function(data) {
      var _a;
      _this.handleThumbXDrag(data);
      if ((_a = _this.props.thumbXProps) === null || _a === void 0 ? void 0 : _a.onDragEnd) {
        _this.props.thumbXProps.onDragEnd(data);
      }
    };
    _this.handleThumbYDrag = function(data) {
      var _a;
      if (!_this.scrollerElement || !_this.trackYElement || !_this.thumbYElement || !_this.scrollValues || !_this.scrollValues.scrollYPossible) {
        return;
      }
      _this._scrollDetection();
      var trackRect = _this.trackYElement.getBoundingClientRect();
      var styles7 = getComputedStyle(_this.trackYElement);
      var paddingTop = parseFloat(styles7.paddingTop) || 0;
      var paddingBottom = parseFloat(styles7.paddingBottom) || 0;
      var trackInnerSize = trackRect.height - paddingTop - paddingBottom;
      var thumbSize = _this.thumbYElement.clientHeight;
      var offset = data.y - paddingTop;
      _this.scrollerElement.scrollTop = calcScrollForThumbOffset(_this.scrollValues.scrollHeight, _this.scrollValues.clientHeight, trackInnerSize, thumbSize, offset);
      if ((_a = _this.props.thumbYProps) === null || _a === void 0 ? void 0 : _a.onDrag) {
        _this.props.thumbYProps.onDrag(data);
      }
    };
    _this.handleThumbYDragEnd = function(data) {
      var _a;
      _this.handleThumbYDrag(data);
      if ((_a = _this.props.thumbYProps) === null || _a === void 0 ? void 0 : _a.onDragEnd) {
        _this.props.thumbYProps.onDragEnd(data);
      }
    };
    _this.handleScrollerScroll = function() {
      _this._scrollDetection();
    };
    _this._scrollDetection = function() {
      !_this._scrollDetectionTO && _this.eventEmitter.emit("scrollStart", _this.getScrollState());
      _this._scrollDetectionTO && self.window && self.window.clearTimeout(_this._scrollDetectionTO);
      _this._scrollDetectionTO = self.window ? self.window.setTimeout(_this._scrollDetectionCallback, _this.props.scrollDetectionThreshold || 0) : null;
    };
    _this._scrollDetectionCallback = function() {
      _this._scrollDetectionTO = null;
      _this.eventEmitter.emit("scrollStop", _this.getScrollState());
    };
    _this.state = {
      trackXVisible: false,
      trackYVisible: false,
      isRTL: props.rtl
    };
    _this.scrollValues = _this.getScrollState(true);
    _this.eventEmitter = new Emittr(15);
    props.onUpdate && _this.eventEmitter.on("update", props.onUpdate);
    props.onScroll && _this.eventEmitter.on("scroll", props.onScroll);
    props.onScrollStart && _this.eventEmitter.on("scrollStart", props.onScrollStart);
    props.onScrollStop && _this.eventEmitter.on("scrollStop", props.onScrollStop);
    _this.id = uuid();
    return _this;
  }
  Object.defineProperty(Scrollbar2.prototype, "scrollTop", {
    get: function get() {
      if (this.scrollerElement) {
        return this.scrollerElement.scrollTop;
      }
      return 0;
    },
    set: function set(top) {
      if (this.scrollerElement) {
        this.scrollerElement.scrollTop = top;
        this.update();
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Scrollbar2.prototype, "scrollLeft", {
    get: function get() {
      if (this.scrollerElement) {
        return this.scrollerElement.scrollLeft;
      }
      return 0;
    },
    set: function set(left) {
      if (this.scrollerElement) {
        this.scrollerElement.scrollLeft = left;
      }
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Scrollbar2.prototype, "scrollHeight", {
    get: function get() {
      if (this.scrollerElement) {
        return this.scrollerElement.scrollHeight;
      }
      return 0;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Scrollbar2.prototype, "scrollWidth", {
    get: function get() {
      if (this.scrollerElement) {
        return this.scrollerElement.scrollWidth;
      }
      return 0;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Scrollbar2.prototype, "clientHeight", {
    get: function get() {
      if (this.scrollerElement) {
        return this.scrollerElement.clientHeight;
      }
      return 0;
    },
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(Scrollbar2.prototype, "clientWidth", {
    get: function get() {
      if (this.scrollerElement) {
        return this.scrollerElement.clientWidth;
      }
      return 0;
    },
    enumerable: false,
    configurable: true
  });
  Scrollbar2.calculateStyles = function(props, state, scrollValues, scrollbarWidth) {
    var _a, _b, _c, _d;
    var useDefaultStyles = !props.noDefaultStyles;
    return {
      holder: __assign(__assign(__assign({}, useDefaultStyles && style.holder), {
        position: "relative"
      }), props.style),
      wrapper: __assign(__assign(__assign({}, useDefaultStyles && __assign(__assign(__assign({}, style.wrapper), !props.disableTracksWidthCompensation && !props.disableTrackYWidthCompensation && (_a = {}, _a[state.isRTL ? "left" : "right"] = state.trackYVisible ? 10 : 0, _a)), !props.disableTracksWidthCompensation && !props.disableTrackXWidthCompensation && {
        bottom: state.trackXVisible ? 10 : 0
      })), props.wrapperProps.style), {
        position: "absolute",
        overflow: "hidden"
      }),
      content: __assign(__assign(__assign(__assign(__assign({}, useDefaultStyles && style.content), props.translateContentSizesToHolder || props.translateContentSizeYToHolder || props.translateContentSizeXToHolder ? {
        display: "table-cell"
      } : {
        padding: 0.05
      }), useDefaultStyles && !(props.translateContentSizesToHolder || props.translateContentSizeYToHolder) && {
        minHeight: "100%"
      }), useDefaultStyles && !(props.translateContentSizesToHolder || props.translateContentSizeXToHolder) && {
        minWidth: "100%"
      }), props.contentProps.style),
      scroller: __assign(__assign(__assign(__assign((_b = {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        paddingBottom: !scrollbarWidth && scrollValues.scrollXPossible ? props.fallbackScrollbarWidth : void 0
      }, _b[state.isRTL ? "paddingLeft" : "paddingRight"] = !scrollbarWidth && scrollValues.scrollYPossible ? props.fallbackScrollbarWidth : void 0, _b), props.scrollerProps.style), !isUndef(props.rtl) && {
        direction: props.rtl ? "rtl" : "ltr"
      }), props.momentum && {
        WebkitOverflowScrolling: "touch"
      }), (_c = {
        overflowY: scrollValues.scrollYPossible ? "scroll" : "hidden",
        overflowX: scrollValues.scrollXPossible ? "scroll" : "hidden",
        marginBottom: scrollValues.scrollXPossible ? -(scrollbarWidth || props.fallbackScrollbarWidth) - Number(scrollValues.zoomLevel !== 1) : void 0
      }, _c[state.isRTL ? "marginLeft" : "marginRight"] = scrollValues.scrollYPossible ? -(scrollbarWidth || props.fallbackScrollbarWidth) - Number(scrollValues.zoomLevel !== 1) : void 0, _c)),
      trackX: __assign(__assign(__assign(__assign({}, useDefaultStyles && style.track.common), useDefaultStyles && style.track.x), props.trackXProps.style), !state.trackXVisible && {
        display: "none"
      }),
      trackY: __assign(__assign(__assign(__assign(__assign({}, useDefaultStyles && style.track.common), useDefaultStyles && style.track.y), useDefaultStyles && (_d = {}, _d[state.isRTL ? "left" : "right"] = 0, _d)), props.trackYProps.style), !state.trackYVisible && {
        display: "none"
      }),
      thumbX: __assign(__assign(__assign({}, useDefaultStyles && style.thumb.common), useDefaultStyles && style.thumb.x), props.thumbXProps.style),
      thumbY: __assign(__assign(__assign({}, useDefaultStyles && style.thumb.common), useDefaultStyles && style.thumb.y), props.thumbYProps.style)
    };
  };
  Scrollbar2.prototype.componentDidMount = function() {
    if (!this.scrollerElement) {
      this.setState(function() {
        throw new Error("scroller element was not created. Possibly you haven't provided HTMLDivElement to renderer's `elementRef` function.");
      });
      return;
    }
    if (!this.contentElement) {
      this.setState(function() {
        throw new Error("content element was not created. Possibly you haven't provided HTMLDivElement to renderer's `elementRef` function.");
      });
      return;
    }
    var props = this.props;
    if (!props.native && !props.mobileNative) {
      if (!this.holderElement) {
        this.setState(function() {
          throw new Error("holder element was not created. Possibly you haven't provided HTMLDivElement to renderer's `elementRef` function.");
        });
        return;
      }
      if (!this.wrapperElement) {
        this.setState(function() {
          throw new Error("wrapper element was not created. Possibly you haven't provided HTMLDivElement to renderer's `elementRef` function.");
        });
        return;
      }
    }
    Loop.addTarget(this);
    if (!isUndef(props.scrollTop)) {
      this.scrollerElement.scrollTop = props.scrollTop;
    }
    if (!isUndef(props.scrollLeft)) {
      this.scrollerElement.scrollLeft = props.scrollLeft;
    }
    this.update(true);
  };
  Scrollbar2.prototype.componentWillUnmount = function() {
    Loop.removeTarget(this);
  };
  Scrollbar2.prototype.componentDidUpdate = function(prevProps, prevState) {
    if (!this.scrollerElement) {
      return;
    }
    var props = this.props;
    if (props.rtl !== prevProps.rtl && props.rtl !== this.state.isRTL) {
      this.setState({
        isRTL: props.rtl
      });
    }
    if (this.state.isRTL !== prevState.isRTL) {
      this.update();
    }
    if (!isUndef(props.scrollTop) && props.scrollTop !== this.scrollerElement.scrollTop) {
      this.scrollerElement.scrollTop = props.scrollTop;
    }
    if (!isUndef(props.scrollLeft) && props.scrollLeft !== this.scrollerElement.scrollLeft) {
      this.scrollerElement.scrollLeft = props.scrollLeft;
    }
    if (prevProps.onUpdate !== props.onUpdate) {
      prevProps.onUpdate && this.eventEmitter.off("update", prevProps.onUpdate);
      props.onUpdate && this.eventEmitter.on("update", props.onUpdate);
    }
    if (prevProps.onScroll !== props.onScroll) {
      prevProps.onScroll && this.eventEmitter.off("scroll", prevProps.onScroll);
      props.onScroll && this.eventEmitter.on("scroll", props.onScroll);
    }
    if (prevProps.onScrollStart !== props.onScrollStart) {
      prevProps.onScrollStart && this.eventEmitter.off("scrollStart", prevProps.onScrollStart);
      props.onScrollStart && this.eventEmitter.on("scrollStart", props.onScrollStart);
    }
    if (prevProps.onScrollStop !== props.onScrollStop) {
      prevProps.onScrollStop && this.eventEmitter.off("scrollStop", prevProps.onScrollStop);
      props.onScrollStop && this.eventEmitter.on("scrollStop", props.onScrollStop);
    }
  };
  Scrollbar2.prototype.render = function() {
    var _a = this.props, createContext3 = _a.createContext, rtl = _a.rtl, native = _a.native, mobileNative = _a.mobileNative, momentum = _a.momentum, noDefaultStyles = _a.noDefaultStyles, disableTracksMousewheelScrolling = _a.disableTracksMousewheelScrolling, disableTrackXMousewheelScrolling = _a.disableTrackXMousewheelScrolling, disableTrackYMousewheelScrolling = _a.disableTrackYMousewheelScrolling, disableTracksWidthCompensation = _a.disableTracksWidthCompensation, disableTrackXWidthCompensation = _a.disableTrackXWidthCompensation, disableTrackYWidthCompensation = _a.disableTrackYWidthCompensation, noScrollX = _a.noScrollX, noScrollY = _a.noScrollY, noScroll = _a.noScroll, permanentTrackX = _a.permanentTrackX, permanentTrackY = _a.permanentTrackY, permanentTracks = _a.permanentTracks, removeTracksWhenNotUsed = _a.removeTracksWhenNotUsed, removeTrackYWhenNotUsed = _a.removeTrackYWhenNotUsed, removeTrackXWhenNotUsed = _a.removeTrackXWhenNotUsed, minimalThumbSize = _a.minimalThumbSize, maximalThumbSize = _a.maximalThumbSize, minimalThumbXSize = _a.minimalThumbXSize, maximalThumbXSize = _a.maximalThumbXSize, minimalThumbYSize = _a.minimalThumbYSize, maximalThumbYSize = _a.maximalThumbYSize, fallbackScrollbarWidth = _a.fallbackScrollbarWidth, scrollTop = _a.scrollTop, scrollLeft = _a.scrollLeft, trackClickBehavior = _a.trackClickBehavior, scrollDetectionThreshold = _a.scrollDetectionThreshold, propsWrapperProps = _a.wrapperProps, propsScrollerProps = _a.scrollerProps, propsContentProps = _a.contentProps, propsTrackXProps = _a.trackXProps, propsTrackYProps = _a.trackYProps, propsThumbXProps = _a.thumbXProps, propsThumbYProps = _a.thumbYProps, propsScrollbarWidth = _a.scrollbarWidth, elementRef = _a.elementRef, onUpdate = _a.onUpdate, onScroll = _a.onScroll, onScrollStart = _a.onScrollStart, onScrollStop = _a.onScrollStop, translateContentSizesToHolder = _a.translateContentSizesToHolder, translateContentSizeYToHolder = _a.translateContentSizeYToHolder, translateContentSizeXToHolder = _a.translateContentSizeXToHolder, children = _a.children, propsHolderProps = __rest(_a, ["createContext", "rtl", "native", "mobileNative", "momentum", "noDefaultStyles", "disableTracksMousewheelScrolling", "disableTrackXMousewheelScrolling", "disableTrackYMousewheelScrolling", "disableTracksWidthCompensation", "disableTrackXWidthCompensation", "disableTrackYWidthCompensation", "noScrollX", "noScrollY", "noScroll", "permanentTrackX", "permanentTrackY", "permanentTracks", "removeTracksWhenNotUsed", "removeTrackYWhenNotUsed", "removeTrackXWhenNotUsed", "minimalThumbSize", "maximalThumbSize", "minimalThumbXSize", "maximalThumbXSize", "minimalThumbYSize", "maximalThumbYSize", "fallbackScrollbarWidth", "scrollTop", "scrollLeft", "trackClickBehavior", "scrollDetectionThreshold", "wrapperProps", "scrollerProps", "contentProps", "trackXProps", "trackYProps", "thumbXProps", "thumbYProps", "scrollbarWidth", "elementRef", "onUpdate", "onScroll", "onScrollStart", "onScrollStop", "translateContentSizesToHolder", "translateContentSizeYToHolder", "translateContentSizeXToHolder", "children"]);
    var scrollbarWidth = !isUndef(propsScrollbarWidth) ? propsScrollbarWidth : getScrollbarWidth() || 0;
    if (native || !scrollbarWidth && mobileNative) {
      this.elementRefHolder(null);
      this.elementRefWrapper(null);
      this.elementRefTrackX(null);
      this.elementRefTrackY(null);
      this.elementRefThumbX(null);
      this.elementRefThumbY(null);
      var contentProps_1 = __assign(__assign({}, propsContentProps), {
        key: "ScrollbarsCustom-Content",
        className: n("ScrollbarsCustom-Content", propsContentProps.className),
        children
      });
      var scrollerProps_1 = __assign(__assign({}, propsHolderProps), {
        className: n("ScrollbarsCustom native", this.state.trackYVisible && "trackYVisible", this.state.trackXVisible && "trackXVisible", this.state.isRTL && "rtl", propsHolderProps.className),
        style: __assign(__assign(__assign(__assign({}, propsHolderProps.style), !isUndef(rtl) && {
          direction: rtl ? "rtl" : "ltr"
        }), momentum && {
          WebkitOverflowScrolling: "touch"
        }), {
          overflowX: noScroll || noScrollX ? "hidden" : permanentTracks || permanentTrackX ? "scroll" : "auto",
          overflowY: noScroll || noScrollY ? "hidden" : permanentTracks || permanentTrackY ? "scroll" : "auto"
        }),
        onScroll: this.handleScrollerScroll,
        children: renderDivWithRenderer(contentProps_1, this.elementRefContent),
        renderer: propsScrollerProps.renderer,
        elementRef: propsScrollerProps.elementRef
      });
      return renderDivWithRenderer(scrollerProps_1, this.elementRefScroller);
    }
    var styles7 = Scrollbar2.calculateStyles(this.props, this.state, this.scrollValues, scrollbarWidth);
    var holderChildren = [];
    var contentProps = __assign(__assign({}, propsContentProps), {
      key: "ScrollbarsCustom-Content",
      className: n("ScrollbarsCustom-Content", propsContentProps.className),
      style: styles7.content,
      children: createContext3 ? createElement7(ScrollbarContext.Provider, {
        value: {
          parentScrollbar: this
        },
        children
      }) : children
    });
    var scrollerProps = __assign(__assign({}, propsScrollerProps), {
      key: "ScrollbarsCustom-Scroller",
      className: n("ScrollbarsCustom-Scroller", propsScrollerProps.className),
      style: styles7.scroller,
      children: renderDivWithRenderer(contentProps, this.elementRefContent),
      onScroll: this.handleScrollerScroll
    });
    var wrapperProps = __assign(__assign({}, propsWrapperProps), {
      key: "ScrollbarsCustom-Wrapper",
      className: n("ScrollbarsCustom-Wrapper", propsWrapperProps.className),
      style: styles7.wrapper,
      children: renderDivWithRenderer(scrollerProps, this.elementRefScroller)
    });
    holderChildren.push(renderDivWithRenderer(wrapperProps, this.elementRefWrapper));
    if (this.state.trackYVisible || !removeTracksWhenNotUsed && !removeTrackYWhenNotUsed) {
      var thumbYProps = __assign(__assign({}, propsThumbYProps), {
        key: "ScrollbarsCustom-ThumbY",
        style: styles7.thumbY,
        elementRef: this.elementRefThumbY,
        onDrag: this.handleThumbYDrag,
        onDragEnd: this.handleThumbYDragEnd,
        axis: AXIS_DIRECTION.Y
      });
      var trackYProps = __assign(__assign(__assign(__assign({}, propsTrackYProps), {
        key: "ScrollbarsCustom-TrackY",
        style: styles7.trackY,
        elementRef: this.elementRefTrackY,
        onClick: this.handleTrackYClick
      }), (disableTracksMousewheelScrolling || disableTrackYMousewheelScrolling) && {
        onWheel: this.handleTrackYMouseWheel
      }), {
        axis: AXIS_DIRECTION.Y
      });
      trackYProps.children = createElement7(ScrollbarThumb, __assign({}, thumbYProps));
      holderChildren.push(createElement7(ScrollbarTrack, __assign({}, trackYProps)));
    } else {
      this.elementRefTrackY(null);
      this.elementRefThumbY(null);
    }
    if (this.state.trackXVisible || !removeTracksWhenNotUsed && !removeTrackXWhenNotUsed) {
      var thumbXProps = __assign(__assign({}, propsThumbXProps), {
        key: "ScrollbarsCustom-ThumbX",
        style: styles7.thumbX,
        elementRef: this.elementRefThumbX,
        onDrag: this.handleThumbXDrag,
        onDragEnd: this.handleThumbXDragEnd,
        axis: AXIS_DIRECTION.X
      });
      var trackXProps = __assign(__assign(__assign(__assign({}, propsTrackXProps), {
        key: "ScrollbarsCustom-TrackX",
        style: styles7.trackX,
        elementRef: this.elementRefTrackX,
        onClick: this.handleTrackXClick
      }), (disableTracksMousewheelScrolling || disableTrackXMousewheelScrolling) && {
        onWheel: this.handleTrackXMouseWheel
      }), {
        axis: AXIS_DIRECTION.X
      });
      trackXProps.children = createElement7(ScrollbarThumb, __assign({}, thumbXProps));
      holderChildren.push(createElement7(ScrollbarTrack, __assign({}, trackXProps)));
    } else {
      this.elementRefTrackX(null);
      this.elementRefThumbX(null);
    }
    var holderProps = __assign(__assign({}, propsHolderProps), {
      className: n("ScrollbarsCustom", this.state.trackYVisible && "trackYVisible", this.state.trackXVisible && "trackXVisible", this.state.isRTL && "rtl", propsHolderProps.className),
      style: styles7.holder,
      children: holderChildren
    });
    return renderDivWithRenderer(holderProps, this.elementRefHolder);
  };
  Scrollbar2.contextType = ScrollbarContext;
  Scrollbar2.propTypes = {
    createContext: import_prop_types5.bool,
    rtl: import_prop_types5.bool,
    native: import_prop_types5.bool,
    mobileNative: import_prop_types5.bool,
    momentum: import_prop_types5.bool,
    noDefaultStyles: import_prop_types5.bool,
    disableTracksMousewheelScrolling: import_prop_types5.bool,
    disableTrackXMousewheelScrolling: import_prop_types5.bool,
    disableTrackYMousewheelScrolling: import_prop_types5.bool,
    disableTracksWidthCompensation: import_prop_types5.bool,
    disableTrackXWidthCompensation: import_prop_types5.bool,
    disableTrackYWidthCompensation: import_prop_types5.bool,
    minimalThumbSize: import_prop_types5.number,
    maximalThumbSize: import_prop_types5.number,
    minimalThumbXSize: import_prop_types5.number,
    maximalThumbXSize: import_prop_types5.number,
    minimalThumbYSize: import_prop_types5.number,
    maximalThumbYSize: import_prop_types5.number,
    noScrollX: import_prop_types5.bool,
    noScrollY: import_prop_types5.bool,
    noScroll: import_prop_types5.bool,
    permanentTrackX: import_prop_types5.bool,
    permanentTrackY: import_prop_types5.bool,
    permanentTracks: import_prop_types5.bool,
    translateContentSizesToHolder: import_prop_types5.bool,
    translateContentSizeYToHolder: import_prop_types5.bool,
    translateContentSizeXToHolder: import_prop_types5.bool,
    removeTracksWhenNotUsed: import_prop_types5.bool,
    removeTrackYWhenNotUsed: import_prop_types5.bool,
    removeTrackXWhenNotUsed: import_prop_types5.bool,
    trackClickBehavior: TRACK_CLICK_BEHAVIOR_PROP_TYPE,
    scrollbarWidth: import_prop_types5.number,
    fallbackScrollbarWidth: import_prop_types5.number,
    scrollDetectionThreshold: import_prop_types5.number,
    scrollTop: import_prop_types5.number,
    scrollLeft: import_prop_types5.number,
    className: import_prop_types5.string,
    wrapperProps: import_prop_types5.object,
    contentProps: import_prop_types5.object,
    trackXProps: import_prop_types5.object,
    trackYProps: import_prop_types5.object,
    thumbXProps: import_prop_types5.object,
    thumbYProps: import_prop_types5.object,
    onUpdate: import_prop_types5.func,
    onScroll: import_prop_types5.func,
    onScrollStart: import_prop_types5.func,
    onScrollStop: import_prop_types5.func
  };
  Scrollbar2.defaultProps = {
    momentum: true,
    minimalThumbSize: 30,
    fallbackScrollbarWidth: 20,
    trackClickBehavior: TRACK_CLICK_BEHAVIOR.JUMP,
    scrollDetectionThreshold: 100,
    wrapperProps: {},
    scrollerProps: {},
    contentProps: {},
    trackXProps: {},
    trackYProps: {},
    thumbXProps: {},
    thumbYProps: {}
  };
  return Scrollbar2;
}(Component);
var rsc_esm_default = Scrollbar;

// src/client/components/Scrollable/Scrollable.tsx
var Container = styled_components_browser_esm_default(rsc_esm_default)``;
var BaseScroller = styled_components_browser_esm_default.div``;
var baseTrack = Ae`
  border-radius: 0px !important;
  background: none !important;
`;
var BaseTrackX = styled_components_browser_esm_default.div`
  ${baseTrack}
  left: 0px !important;
  width: 100% !important;
`;
var BaseTrackY = styled_components_browser_esm_default.div`
  ${baseTrack}
  top: 0px !important;
  height: 100% !important;
`;
var baseThumb = Ae`
  border-radius: 0px !important;
`;
var getThumbColor = (theme) => theme.palette.type === "dark" ? curriedLighten(".2", theme.palette.background.default) : curriedDarken(".2", theme.palette.background.default);
var BaseThumbX = styled_components_browser_esm_default.div`
  ${baseThumb}
  background-color: ${(props) => getThumbColor(props.theme)} !important;
`;
var BaseThumbY = styled_components_browser_esm_default.div`
  ${baseThumb}
  background-color: ${(props) => getThumbColor(props.theme)} !important;
`;
var BaseWrapper = styled_components_browser_esm_default.div``;
var Scrollable = ({
  TrackX = BaseTrackX,
  TrackY = BaseTrackY,
  ThumbX = BaseThumbX,
  ThumbY = BaseThumbY,
  Wrapper = BaseWrapper,
  Scroller = BaseScroller,
  forwardedRef,
  onScroll,
  ...props
}) => /* @__PURE__ */ React7.createElement(Container, {
  ...props,
  trackXProps: {
    renderer: ({elementRef, ...itemProps}) => /* @__PURE__ */ React7.createElement(TrackX, {
      ref: elementRef,
      ...itemProps
    })
  },
  trackYProps: {
    renderer: ({elementRef, ...itemProps}) => /* @__PURE__ */ React7.createElement(TrackY, {
      ref: elementRef,
      ...itemProps
    })
  },
  thumbXProps: {
    renderer: ({elementRef, ...itemProps}) => /* @__PURE__ */ React7.createElement(ThumbX, {
      ref: elementRef,
      ...itemProps
    })
  },
  thumbYProps: {
    renderer: ({elementRef, ...itemProps}) => /* @__PURE__ */ React7.createElement(ThumbY, {
      ref: elementRef,
      ...itemProps
    })
  },
  wrapperProps: {
    renderer: ({elementRef, ...itemProps}) => /* @__PURE__ */ React7.createElement(Wrapper, {
      ref: elementRef,
      ...itemProps
    })
  },
  scrollerProps: {
    renderer: ({elementRef, onScroll: rscOnScroll, ...itemProps}) => /* @__PURE__ */ React7.createElement(Scroller, {
      ...itemProps,
      onScroll: (e2) => {
        if (onScroll) {
          onScroll(e2);
        }
        if (rscOnScroll) {
          rscOnScroll(e2);
        }
      },
      ref: (ref) => {
        if (forwardedRef) {
          forwardedRef(ref);
        }
        if (elementRef) {
          elementRef(ref);
        }
      }
    })
  }
});
var Scroll = React7.memo(Scrollable);
function MemoScrollable(props) {
  return /* @__PURE__ */ React7.createElement(Scroll, {
    ...props
  });
}
var Scrollable_default = MemoScrollable;

// src/client/components/List/List.tsx
var ScrollableWithRef = React8.forwardRef((props, ref) => /* @__PURE__ */ React8.createElement(Scrollable_default, {
  forwardedRef: ref,
  ...props
}));
var Render = (renderItem) => React8.memo((props) => {
  return /* @__PURE__ */ React8.createElement("div", {
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
  const listRef = React8.createRef();
  const outerRef = React8.createRef();
  const renderer = Render(renderItem);
  return /* @__PURE__ */ React8.createElement(index_esm_default, {
    defaultHeight: props.height,
    defaultWidth: props.width,
    disableHeight: Boolean(props.height),
    disableWidth: Boolean(props.width)
  }, ({height, width}) => {
    return /* @__PURE__ */ React8.createElement(VariableSizeList, {
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
var List = React8.memo(VirtualList);
function MemoList(props) {
  return /* @__PURE__ */ React8.createElement(List, {
    ...props
  });
}
var List_default = MemoList;

// src/client/components/List/ListItem.tsx
import React9 from "https://cdn.skypack.dev/react";
var ButtonListItem = (props) => /* @__PURE__ */ React9.createElement(ListItem_default, {
  dense: true,
  ...props,
  button: true
});

// src/client/components/List/ListItemSecondaryAction.tsx
import React10 from "https://cdn.skypack.dev/react";
var ListItemSecondaryAction3 = (props) => /* @__PURE__ */ React10.createElement(ListItemSecondaryAction_default, {
  ...props
});

// src/client/components/List/ListItemText.tsx
import React11 from "https://cdn.skypack.dev/react";
var ListItemText3 = (props) => /* @__PURE__ */ React11.createElement(ListItemText_default, {
  ...props
});

export {
  React9 as React,
  ListContext_default,
  ButtonListItem,
  ListItemSecondaryAction3 as ListItemSecondaryAction,
  ListItemText3 as ListItemText,
  List_default,
  Typography_default,
  Scrollable_default,
  ListItem_default
};
//# sourceMappingURL=chunk.3ICOTVRY.js.map
