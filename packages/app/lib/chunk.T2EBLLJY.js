import {
  __toModule,
  _defineProperty,
  _extends,
  _objectWithoutProperties,
  _toConsumableArray,
  clsx_m_default,
  defaultTheme_default,
  handleBreakpoints,
  makeStyles,
  merge_default,
  require_hoist_non_react_statics_cjs,
  require_prop_types,
  spacing,
  styled_components_browser_esm_default
} from "./chunk.JCC25JS6.js";

// src/client/components/Layout/Column.tsx
import React4 from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/system/esm/style.js
function getPath(obj, path) {
  if (!path || typeof path !== "string") {
    return null;
  }
  return path.split(".").reduce(function(acc, item) {
    return acc && acc[item] ? acc[item] : null;
  }, obj);
}
function style(options) {
  var prop = options.prop, _options$cssProperty = options.cssProperty, cssProperty = _options$cssProperty === void 0 ? options.prop : _options$cssProperty, themeKey = options.themeKey, transform3 = options.transform;
  var fn = function fn2(props) {
    if (props[prop] == null) {
      return null;
    }
    var propValue = props[prop];
    var theme = props.theme;
    var themeMapping = getPath(theme, themeKey) || {};
    var styleFromPropValue = function styleFromPropValue2(propValueFinal) {
      var value;
      if (typeof themeMapping === "function") {
        value = themeMapping(propValueFinal);
      } else if (Array.isArray(themeMapping)) {
        value = themeMapping[propValueFinal] || propValueFinal;
      } else {
        value = getPath(themeMapping, propValueFinal) || propValueFinal;
        if (transform3) {
          value = transform3(value);
        }
      }
      if (cssProperty === false) {
        return value;
      }
      return _defineProperty({}, cssProperty, value);
    };
    return handleBreakpoints(props, propValue, styleFromPropValue);
  };
  fn.propTypes = false ? _defineProperty({}, prop, responsivePropType_default) : {};
  fn.filterProps = [prop];
  return fn;
}
var style_default = style;

// node_modules/@material-ui/system/esm/compose.js
function compose() {
  for (var _len = arguments.length, styles = new Array(_len), _key = 0; _key < _len; _key++) {
    styles[_key] = arguments[_key];
  }
  var fn = function fn2(props) {
    return styles.reduce(function(acc, style2) {
      var output = style2(props);
      if (output) {
        return merge_default(acc, output);
      }
      return acc;
    }, {});
  };
  fn.propTypes = false ? styles.reduce(function(acc, style2) {
    return _extends(acc, style2.propTypes);
  }, {}) : {};
  fn.filterProps = styles.reduce(function(acc, style2) {
    return acc.concat(style2.filterProps);
  }, []);
  return fn;
}
var compose_default = compose;

// node_modules/@material-ui/system/esm/borders.js
function getBorder(value) {
  if (typeof value !== "number") {
    return value;
  }
  return "".concat(value, "px solid");
}
var border = style_default({
  prop: "border",
  themeKey: "borders",
  transform: getBorder
});
var borderTop = style_default({
  prop: "borderTop",
  themeKey: "borders",
  transform: getBorder
});
var borderRight = style_default({
  prop: "borderRight",
  themeKey: "borders",
  transform: getBorder
});
var borderBottom = style_default({
  prop: "borderBottom",
  themeKey: "borders",
  transform: getBorder
});
var borderLeft = style_default({
  prop: "borderLeft",
  themeKey: "borders",
  transform: getBorder
});
var borderColor = style_default({
  prop: "borderColor",
  themeKey: "palette"
});
var borderRadius = style_default({
  prop: "borderRadius",
  themeKey: "shape"
});
var borders = compose_default(border, borderTop, borderRight, borderBottom, borderLeft, borderColor, borderRadius);
var borders_default = borders;

// node_modules/@material-ui/system/esm/css.js
var import_prop_types = __toModule(require_prop_types());
function omit(input, fields) {
  var output = {};
  Object.keys(input).forEach(function(prop) {
    if (fields.indexOf(prop) === -1) {
      output[prop] = input[prop];
    }
  });
  return output;
}
function css(styleFunction2) {
  var newStyleFunction = function newStyleFunction2(props) {
    var output = styleFunction2(props);
    if (props.css) {
      return _extends({}, merge_default(output, styleFunction2(_extends({
        theme: props.theme
      }, props.css))), omit(props.css, [styleFunction2.filterProps]));
    }
    return output;
  };
  newStyleFunction.propTypes = false ? _extends({}, styleFunction2.propTypes, {
    css: import_prop_types.default.object
  }) : {};
  newStyleFunction.filterProps = ["css"].concat(_toConsumableArray(styleFunction2.filterProps));
  return newStyleFunction;
}
var css_default = css;

// node_modules/@material-ui/system/esm/display.js
var displayPrint = style_default({
  prop: "displayPrint",
  cssProperty: false,
  transform: function transform(value) {
    return {
      "@media print": {
        display: value
      }
    };
  }
});
var displayRaw = style_default({
  prop: "display"
});
var overflow = style_default({
  prop: "overflow"
});
var textOverflow = style_default({
  prop: "textOverflow"
});
var visibility = style_default({
  prop: "visibility"
});
var whiteSpace = style_default({
  prop: "whiteSpace"
});
var display_default = compose_default(displayPrint, displayRaw, overflow, textOverflow, visibility, whiteSpace);

// node_modules/@material-ui/system/esm/flexbox.js
var flexBasis = style_default({
  prop: "flexBasis"
});
var flexDirection = style_default({
  prop: "flexDirection"
});
var flexWrap = style_default({
  prop: "flexWrap"
});
var justifyContent = style_default({
  prop: "justifyContent"
});
var alignItems = style_default({
  prop: "alignItems"
});
var alignContent = style_default({
  prop: "alignContent"
});
var order = style_default({
  prop: "order"
});
var flex = style_default({
  prop: "flex"
});
var flexGrow = style_default({
  prop: "flexGrow"
});
var flexShrink = style_default({
  prop: "flexShrink"
});
var alignSelf = style_default({
  prop: "alignSelf"
});
var justifyItems = style_default({
  prop: "justifyItems"
});
var justifySelf = style_default({
  prop: "justifySelf"
});
var flexbox = compose_default(flexBasis, flexDirection, flexWrap, justifyContent, alignItems, alignContent, order, flex, flexGrow, flexShrink, alignSelf, justifyItems, justifySelf);
var flexbox_default = flexbox;

// node_modules/@material-ui/system/esm/grid.js
var gridGap = style_default({
  prop: "gridGap"
});
var gridColumnGap = style_default({
  prop: "gridColumnGap"
});
var gridRowGap = style_default({
  prop: "gridRowGap"
});
var gridColumn = style_default({
  prop: "gridColumn"
});
var gridRow = style_default({
  prop: "gridRow"
});
var gridAutoFlow = style_default({
  prop: "gridAutoFlow"
});
var gridAutoColumns = style_default({
  prop: "gridAutoColumns"
});
var gridAutoRows = style_default({
  prop: "gridAutoRows"
});
var gridTemplateColumns = style_default({
  prop: "gridTemplateColumns"
});
var gridTemplateRows = style_default({
  prop: "gridTemplateRows"
});
var gridTemplateAreas = style_default({
  prop: "gridTemplateAreas"
});
var gridArea = style_default({
  prop: "gridArea"
});
var grid = compose_default(gridGap, gridColumnGap, gridRowGap, gridColumn, gridRow, gridAutoFlow, gridAutoColumns, gridAutoRows, gridTemplateColumns, gridTemplateRows, gridTemplateAreas, gridArea);
var grid_default = grid;

// node_modules/@material-ui/system/esm/palette.js
var color = style_default({
  prop: "color",
  themeKey: "palette"
});
var bgcolor = style_default({
  prop: "bgcolor",
  cssProperty: "backgroundColor",
  themeKey: "palette"
});
var palette = compose_default(color, bgcolor);
var palette_default = palette;

// node_modules/@material-ui/system/esm/positions.js
var position = style_default({
  prop: "position"
});
var zIndex = style_default({
  prop: "zIndex",
  themeKey: "zIndex"
});
var top = style_default({
  prop: "top"
});
var right = style_default({
  prop: "right"
});
var bottom = style_default({
  prop: "bottom"
});
var left = style_default({
  prop: "left"
});
var positions_default = compose_default(position, zIndex, top, right, bottom, left);

// node_modules/@material-ui/system/esm/shadows.js
var boxShadow = style_default({
  prop: "boxShadow",
  themeKey: "shadows"
});
var shadows_default = boxShadow;

// node_modules/@material-ui/system/esm/sizing.js
function transform2(value) {
  return value <= 1 ? "".concat(value * 100, "%") : value;
}
var width = style_default({
  prop: "width",
  transform: transform2
});
var maxWidth = style_default({
  prop: "maxWidth",
  transform: transform2
});
var minWidth = style_default({
  prop: "minWidth",
  transform: transform2
});
var height = style_default({
  prop: "height",
  transform: transform2
});
var maxHeight = style_default({
  prop: "maxHeight",
  transform: transform2
});
var minHeight = style_default({
  prop: "minHeight",
  transform: transform2
});
var sizeWidth = style_default({
  prop: "size",
  cssProperty: "width",
  transform: transform2
});
var sizeHeight = style_default({
  prop: "size",
  cssProperty: "height",
  transform: transform2
});
var boxSizing = style_default({
  prop: "boxSizing"
});
var sizing = compose_default(width, maxWidth, minWidth, height, maxHeight, minHeight, boxSizing);
var sizing_default = sizing;

// node_modules/@material-ui/system/esm/spacing.js
var spacing_default = spacing;

// node_modules/@material-ui/system/esm/typography.js
var fontFamily = style_default({
  prop: "fontFamily",
  themeKey: "typography"
});
var fontSize = style_default({
  prop: "fontSize",
  themeKey: "typography"
});
var fontStyle = style_default({
  prop: "fontStyle",
  themeKey: "typography"
});
var fontWeight = style_default({
  prop: "fontWeight",
  themeKey: "typography"
});
var letterSpacing = style_default({
  prop: "letterSpacing"
});
var lineHeight = style_default({
  prop: "lineHeight"
});
var textAlign = style_default({
  prop: "textAlign"
});
var typography = compose_default(fontFamily, fontSize, fontStyle, fontWeight, letterSpacing, lineHeight, textAlign);
var typography_default = typography;

// node_modules/@material-ui/styles/esm/styled/styled.js
import React from "https://cdn.skypack.dev/react";
var import_prop_types2 = __toModule(require_prop_types());
var import_hoist_non_react_statics = __toModule(require_hoist_non_react_statics_cjs());
function omit2(input, fields) {
  var output = {};
  Object.keys(input).forEach(function(prop) {
    if (fields.indexOf(prop) === -1) {
      output[prop] = input[prop];
    }
  });
  return output;
}
function styled(Component) {
  var componentCreator = function componentCreator2(style2) {
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var name = options.name, stylesOptions = _objectWithoutProperties(options, ["name"]);
    if (false) {
      throw new Error(["You are calling styled(Component)(style) with an undefined component.", "You may have forgotten to import it."].join("\n"));
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
    var stylesOrCreator = typeof style2 === "function" ? function(theme) {
      return {
        root: function root(props) {
          return style2(_extends({
            theme
          }, props));
        }
      };
    } : {
      root: style2
    };
    var useStyles = makeStyles(stylesOrCreator, _extends({
      Component,
      name: name || Component.displayName,
      classNamePrefix
    }, stylesOptions));
    var filterProps;
    var propTypes = {};
    if (style2.filterProps) {
      filterProps = style2.filterProps;
      delete style2.filterProps;
    }
    if (style2.propTypes) {
      propTypes = style2.propTypes;
      delete style2.propTypes;
    }
    var StyledComponent = /* @__PURE__ */ React.forwardRef(function StyledComponent2(props, ref) {
      var children = props.children, classNameProp = props.className, clone = props.clone, ComponentProp = props.component, other = _objectWithoutProperties(props, ["children", "className", "clone", "component"]);
      var classes = useStyles(props);
      var className = clsx_m_default(classes.root, classNameProp);
      var spread = other;
      if (filterProps) {
        spread = omit2(spread, filterProps);
      }
      if (clone) {
        return /* @__PURE__ */ React.cloneElement(children, _extends({
          className: clsx_m_default(children.props.className, className)
        }, spread));
      }
      if (typeof children === "function") {
        return children(_extends({
          className
        }, spread));
      }
      var FinalComponent = ComponentProp || Component;
      return /* @__PURE__ */ React.createElement(FinalComponent, _extends({
        ref,
        className
      }, spread), children);
    });
    false ? StyledComponent.propTypes = _extends({
      children: import_prop_types2.default.oneOfType([import_prop_types2.default.node, import_prop_types2.default.func]),
      className: import_prop_types2.default.string,
      clone: chainPropTypes(import_prop_types2.default.bool, function(props) {
        if (props.clone && props.component) {
          return new Error("You can not use the clone and component prop at the same time.");
        }
        return null;
      }),
      component: import_prop_types2.default.elementType
    }, propTypes) : void 0;
    if (false) {
      StyledComponent.displayName = "Styled(".concat(classNamePrefix, ")");
    }
    import_hoist_non_react_statics.default(StyledComponent, Component);
    return StyledComponent;
  };
  return componentCreator;
}

// node_modules/@material-ui/core/esm/styles/styled.js
var styled2 = function styled3(Component) {
  var componentCreator = styled(Component);
  return function(style2, options) {
    return componentCreator(style2, _extends({
      defaultTheme: defaultTheme_default
    }, options));
  };
};
var styled_default = styled2;

// node_modules/@material-ui/core/esm/Box/Box.js
var styleFunction = css_default(compose_default(borders_default, display_default, flexbox_default, grid_default, positions_default, palette_default, shadows_default, sizing_default, spacing_default, typography_default));
var Box = styled_default("div")(styleFunction, {
  name: "MuiBox"
});
var Box_default = Box;

// src/client/components/Layout/constants.ts
var MIN_ITEM_HEIGHT = 200;
var MIN_ITEM_WIDTH = 200;

// src/client/components/Layout/Row.tsx
import React2 from "https://cdn.skypack.dev/react";
var Wrapper = styled_components_browser_esm_default.div`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  flex-wrap: wrap;
`;
var Row = (props) => {
  let children = props.children;
  return /* @__PURE__ */ React2.createElement(Wrapper, {
    style: {
      minHeight: props.minHeight || MIN_ITEM_HEIGHT,
      width: "100%"
    },
    className: "LayoutRow"
  }, children);
};
Row.displayName = "LayoutRow";
var Row_default = Row;

// src/client/components/Layout/Panel.tsx
import React3 from "https://cdn.skypack.dev/react";
var PanelWrapper = styled_components_browser_esm_default(Box_default)`
  border-radius: 2px;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme?.palette?.divider};
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;
var Panel = (props) => {
  let children = props.children;
  if (Array.isArray(children)) {
    children = children.map((c, idx) => {
      if (React3.isValidElement(c)) {
        if (c.type !== Row_default) {
          return /* @__PURE__ */ React3.createElement(Row_default, {
            key: idx,
            minHeight: props.minHeight
          }, c);
        }
        return React3.cloneElement(c, {
          minHeight: props.minHeight,
          key: idx
        });
      }
      return /* @__PURE__ */ React3.createElement(Row_default, {
        key: idx,
        minHeight: props.minHeight
      }, c);
    });
  } else if (React3.isValidElement(children)) {
    let hasLayoutComponentChild = false;
    React3.Children.forEach(children, (c, idx) => {
      if (c.type === Column_default || c.type === Row_default) {
        hasLayoutComponentChild = true;
      }
    });
    if (hasLayoutComponentChild) {
      children = React3.Children.map(children, (c, idx) => {
        if (c.type === Row_default) {
          return React3.cloneElement(c, {
            minHeight: props.minHeight,
            key: idx
          });
        }
        return /* @__PURE__ */ React3.createElement(Row_default, {
          minHeight: props.minHeight
        }, c);
      });
    }
  }
  return /* @__PURE__ */ React3.createElement(Box_default, {
    width: "100%",
    height: "100%",
    p: 0.25,
    className: "LayoutPanel"
  }, /* @__PURE__ */ React3.createElement(PanelWrapper, {
    p: 1
  }, children));
};
Panel.displayName = "LayoutPanel";
var Panel_default = Panel;

// src/client/components/Layout/Column.tsx
var Column = (props) => {
  let children = props.children;
  if (React4.isValidElement(children)) {
    let hasLayoutComponentChild = false;
    React4.Children.forEach(children, (c, idx) => {
      if (c.type.toString() === Column.toString() || c.type.toString() === Row_default.toString()) {
        hasLayoutComponentChild = true;
      }
    });
    if (hasLayoutComponentChild) {
      children = React4.Children.map(children, (c, idx) => {
        if (c.type.toString() === Row_default.toString()) {
          return React4.cloneElement(c, {
            minHeight: props.minHeight,
            key: idx
          });
        }
        return /* @__PURE__ */ React4.createElement(Row_default, {
          minHeight: props.minHeight
        }, c);
      });
    } else {
      children = React4.Children.map(children, (c, idx) => {
        if (c.type.toString() !== Panel_default.toString()) {
          return /* @__PURE__ */ React4.createElement(Panel_default, {
            key: idx,
            minHeight: props.minHeight
          }, c);
        }
        return React4.cloneElement(c, {
          key: idx,
          minHeight: props.minHeight
        });
      });
    }
  } else {
    children = /* @__PURE__ */ React4.createElement(Panel_default, {
      minHeight: props.minHeight
    }, children);
  }
  return /* @__PURE__ */ React4.createElement(Box_default, {
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: props.minHeight || MIN_ITEM_HEIGHT,
    minWidth: MIN_ITEM_WIDTH,
    className: "LayoutColumn"
  }, children);
};
Column.displayName = "LayoutColumn";
var Column_default = Column;

export {
  MIN_ITEM_HEIGHT,
  Row_default,
  Box_default,
  Column_default,
  Panel_default
};
//# sourceMappingURL=chunk.UOWO7TXD.js.map
