import {
  ButtonBase_default,
  capitalize,
  withStyles_default
} from "./chunk.D4WESEBB.js";
import {
  Ae,
  __toModule,
  _extends,
  _objectWithoutProperties,
  clamp,
  clsx_m_default,
  decomposeColor,
  recomposeColor,
  require_prop_types,
  styled_components_browser_esm_default
} from "./chunk.JCC25JS6.js";

// src/client/components/Button/Button.tsx
import React2 from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/core/esm/Button/Button.js
var import_prop_types = __toModule(require_prop_types());
import {
  createElement,
  forwardRef
} from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/core/esm/styles/colorManipulator.js
function fade(color, value) {
  color = decomposeColor(color);
  value = clamp(value);
  if (color.type === "rgb" || color.type === "hsl") {
    color.type += "a";
  }
  color.values[3] = value;
  return recomposeColor(color);
}

// node_modules/@material-ui/core/esm/Button/Button.js
var styles = function styles2(theme) {
  return {
    root: _extends({}, theme.typography.button, {
      boxSizing: "border-box",
      minWidth: 64,
      padding: "6px 16px",
      borderRadius: theme.shape.borderRadius,
      color: theme.palette.text.primary,
      transition: theme.transitions.create(["background-color", "box-shadow", "border"], {
        duration: theme.transitions.duration.short
      }),
      "&:hover": {
        textDecoration: "none",
        backgroundColor: fade(theme.palette.text.primary, theme.palette.action.hoverOpacity),
        "@media (hover: none)": {
          backgroundColor: "transparent"
        },
        "&$disabled": {
          backgroundColor: "transparent"
        }
      },
      "&$disabled": {
        color: theme.palette.action.disabled
      }
    }),
    label: {
      width: "100%",
      display: "inherit",
      alignItems: "inherit",
      justifyContent: "inherit"
    },
    text: {
      padding: "6px 8px"
    },
    textPrimary: {
      color: theme.palette.primary.main,
      "&:hover": {
        backgroundColor: fade(theme.palette.primary.main, theme.palette.action.hoverOpacity),
        "@media (hover: none)": {
          backgroundColor: "transparent"
        }
      }
    },
    textSecondary: {
      color: theme.palette.secondary.main,
      "&:hover": {
        backgroundColor: fade(theme.palette.secondary.main, theme.palette.action.hoverOpacity),
        "@media (hover: none)": {
          backgroundColor: "transparent"
        }
      }
    },
    outlined: {
      padding: "5px 15px",
      border: "1px solid ".concat(theme.palette.type === "light" ? "rgba(0, 0, 0, 0.23)" : "rgba(255, 255, 255, 0.23)"),
      "&$disabled": {
        border: "1px solid ".concat(theme.palette.action.disabledBackground)
      }
    },
    outlinedPrimary: {
      color: theme.palette.primary.main,
      border: "1px solid ".concat(fade(theme.palette.primary.main, 0.5)),
      "&:hover": {
        border: "1px solid ".concat(theme.palette.primary.main),
        backgroundColor: fade(theme.palette.primary.main, theme.palette.action.hoverOpacity),
        "@media (hover: none)": {
          backgroundColor: "transparent"
        }
      }
    },
    outlinedSecondary: {
      color: theme.palette.secondary.main,
      border: "1px solid ".concat(fade(theme.palette.secondary.main, 0.5)),
      "&:hover": {
        border: "1px solid ".concat(theme.palette.secondary.main),
        backgroundColor: fade(theme.palette.secondary.main, theme.palette.action.hoverOpacity),
        "@media (hover: none)": {
          backgroundColor: "transparent"
        }
      },
      "&$disabled": {
        border: "1px solid ".concat(theme.palette.action.disabled)
      }
    },
    contained: {
      color: theme.palette.getContrastText(theme.palette.grey[300]),
      backgroundColor: theme.palette.grey[300],
      boxShadow: theme.shadows[2],
      "&:hover": {
        backgroundColor: theme.palette.grey.A100,
        boxShadow: theme.shadows[4],
        "@media (hover: none)": {
          boxShadow: theme.shadows[2],
          backgroundColor: theme.palette.grey[300]
        },
        "&$disabled": {
          backgroundColor: theme.palette.action.disabledBackground
        }
      },
      "&$focusVisible": {
        boxShadow: theme.shadows[6]
      },
      "&:active": {
        boxShadow: theme.shadows[8]
      },
      "&$disabled": {
        color: theme.palette.action.disabled,
        boxShadow: theme.shadows[0],
        backgroundColor: theme.palette.action.disabledBackground
      }
    },
    containedPrimary: {
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.main,
      "&:hover": {
        backgroundColor: theme.palette.primary.dark,
        "@media (hover: none)": {
          backgroundColor: theme.palette.primary.main
        }
      }
    },
    containedSecondary: {
      color: theme.palette.secondary.contrastText,
      backgroundColor: theme.palette.secondary.main,
      "&:hover": {
        backgroundColor: theme.palette.secondary.dark,
        "@media (hover: none)": {
          backgroundColor: theme.palette.secondary.main
        }
      }
    },
    disableElevation: {
      boxShadow: "none",
      "&:hover": {
        boxShadow: "none"
      },
      "&$focusVisible": {
        boxShadow: "none"
      },
      "&:active": {
        boxShadow: "none"
      },
      "&$disabled": {
        boxShadow: "none"
      }
    },
    focusVisible: {},
    disabled: {},
    colorInherit: {
      color: "inherit",
      borderColor: "currentColor"
    },
    textSizeSmall: {
      padding: "4px 5px",
      fontSize: theme.typography.pxToRem(13)
    },
    textSizeLarge: {
      padding: "8px 11px",
      fontSize: theme.typography.pxToRem(15)
    },
    outlinedSizeSmall: {
      padding: "3px 9px",
      fontSize: theme.typography.pxToRem(13)
    },
    outlinedSizeLarge: {
      padding: "7px 21px",
      fontSize: theme.typography.pxToRem(15)
    },
    containedSizeSmall: {
      padding: "4px 10px",
      fontSize: theme.typography.pxToRem(13)
    },
    containedSizeLarge: {
      padding: "8px 22px",
      fontSize: theme.typography.pxToRem(15)
    },
    sizeSmall: {},
    sizeLarge: {},
    fullWidth: {
      width: "100%"
    },
    startIcon: {
      display: "inherit",
      marginRight: 8,
      marginLeft: -4,
      "&$iconSizeSmall": {
        marginLeft: -2
      }
    },
    endIcon: {
      display: "inherit",
      marginRight: -4,
      marginLeft: 8,
      "&$iconSizeSmall": {
        marginRight: -2
      }
    },
    iconSizeSmall: {
      "& > *:first-child": {
        fontSize: 18
      }
    },
    iconSizeMedium: {
      "& > *:first-child": {
        fontSize: 20
      }
    },
    iconSizeLarge: {
      "& > *:first-child": {
        fontSize: 22
      }
    }
  };
};
var Button = /* @__PURE__ */ forwardRef(function Button2(props, ref) {
  var children = props.children, classes = props.classes, className = props.className, _props$color = props.color, color = _props$color === void 0 ? "default" : _props$color, _props$component = props.component, component = _props$component === void 0 ? "button" : _props$component, _props$disabled = props.disabled, disabled = _props$disabled === void 0 ? false : _props$disabled, _props$disableElevati = props.disableElevation, disableElevation = _props$disableElevati === void 0 ? false : _props$disableElevati, _props$disableFocusRi = props.disableFocusRipple, disableFocusRipple = _props$disableFocusRi === void 0 ? false : _props$disableFocusRi, endIconProp = props.endIcon, focusVisibleClassName = props.focusVisibleClassName, _props$fullWidth = props.fullWidth, fullWidth = _props$fullWidth === void 0 ? false : _props$fullWidth, _props$size = props.size, size = _props$size === void 0 ? "medium" : _props$size, startIconProp = props.startIcon, _props$type = props.type, type = _props$type === void 0 ? "button" : _props$type, _props$variant = props.variant, variant = _props$variant === void 0 ? "text" : _props$variant, other = _objectWithoutProperties(props, ["children", "classes", "className", "color", "component", "disabled", "disableElevation", "disableFocusRipple", "endIcon", "focusVisibleClassName", "fullWidth", "size", "startIcon", "type", "variant"]);
  var startIcon = startIconProp && /* @__PURE__ */ createElement("span", {
    className: clsx_m_default(classes.startIcon, classes["iconSize".concat(capitalize(size))])
  }, startIconProp);
  var endIcon = endIconProp && /* @__PURE__ */ createElement("span", {
    className: clsx_m_default(classes.endIcon, classes["iconSize".concat(capitalize(size))])
  }, endIconProp);
  return /* @__PURE__ */ createElement(ButtonBase_default, _extends({
    className: clsx_m_default(classes.root, classes[variant], className, color === "inherit" ? classes.colorInherit : color !== "default" && classes["".concat(variant).concat(capitalize(color))], size !== "medium" && [classes["".concat(variant, "Size").concat(capitalize(size))], classes["size".concat(capitalize(size))]], disableElevation && classes.disableElevation, disabled && classes.disabled, fullWidth && classes.fullWidth),
    component,
    disabled,
    focusRipple: !disableFocusRipple,
    focusVisibleClassName: clsx_m_default(classes.focusVisible, focusVisibleClassName),
    ref,
    type
  }, other), /* @__PURE__ */ createElement("span", {
    className: classes.label
  }, startIcon, children, endIcon));
});
false ? Button.propTypes = {
  children: import_prop_types.default.node,
  classes: import_prop_types.default.object,
  className: import_prop_types.default.string,
  color: import_prop_types.default.oneOf(["default", "inherit", "primary", "secondary"]),
  component: import_prop_types.default.elementType,
  disabled: import_prop_types.default.bool,
  disableElevation: import_prop_types.default.bool,
  disableFocusRipple: import_prop_types.default.bool,
  disableRipple: import_prop_types.default.bool,
  endIcon: import_prop_types.default.node,
  focusVisibleClassName: import_prop_types.default.string,
  fullWidth: import_prop_types.default.bool,
  href: import_prop_types.default.string,
  size: import_prop_types.default.oneOf(["large", "medium", "small"]),
  startIcon: import_prop_types.default.node,
  type: import_prop_types.default.oneOfType([import_prop_types.default.oneOf(["button", "reset", "submit"]), import_prop_types.default.string]),
  variant: import_prop_types.default.oneOf(["contained", "outlined", "text"])
} : void 0;
var Button_default = withStyles_default(styles, {
  name: "MuiButton"
})(Button);

// src/client/components/Button/Button.tsx
var BaseButton = ({children, state, ...rest}) => {
  return /* @__PURE__ */ React2.createElement(Button_default, {
    size: rest.size || "small",
    ...rest
  }, children);
};
var getColorForState = (theme, state) => {
  switch (state) {
    case "primary":
      return theme.palette.primary;
    case "secondary":
      return theme.palette.secondary;
    case "error":
      return theme.palette.error;
    case "warning":
      return theme.palette.warning;
    case "success":
      return theme.palette.success;
    default:
      return theme.palette.info;
  }
};
var Button3 = styled_components_browser_esm_default(BaseButton)`
  box-shadow: none;
  text-decoration: none;
  &:hover {
    box-shadow: none;
  }
  color: ${(props) => getColorForState(props.theme, props.state).contrastText};

  ${(props) => props.variant === "contained" && Ae`
      background-color: ${getColorForState(props.theme, props.state).main};
      &:hover {
        background-color: ${getColorForState(props.theme, props.state).light};
      }
    `}
  }}
  ${(props) => (props.variant === "text" || props.variant === "outlined") && Ae`
      color: ${getColorForState(props.theme, props.state).main};
      &:hover {
        color: ${getColorForState(props.theme, props.state).light};
      }
    `}
  }}
  ${(props) => props.variant === "outlined" && Ae`
      border-color: ${getColorForState(props.theme, props.state).main};
      &:hover {
        border-color: ${getColorForState(props.theme, props.state).light};
      }
    `}
  }}
`;
var Button_default2 = Button3;

export {
  Button_default2 as Button_default,
  fade
};
//# sourceMappingURL=chunk.H7OIU37M.js.map
