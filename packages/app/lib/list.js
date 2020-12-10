import {
  ButtonListItem,
  ListContext_default,
  ListItemSecondaryAction,
  ListItemText,
  ListItem_default,
  List_default,
  React
} from "./chunk.QYNTIDVB.js";
import {
  withStyles_default
} from "./chunk.L67S57WQ.js";
import "./chunk.GJTYBYO4.js";
import {
  __toModule,
  _extends,
  _objectWithoutProperties,
  clsx_m_default,
  require_prop_types
} from "./chunk.MAS4Q2ZR.js";

// src/client/components/List/ListItemAvatar.tsx
import React3 from "https://cdn.skypack.dev/react";
import styled from "https://cdn.skypack.dev/styled-components";

// node_modules/@material-ui/core/esm/ListItemAvatar/ListItemAvatar.js
var import_prop_types = __toModule(require_prop_types());
import {
  createElement,
  forwardRef,
  useContext
} from "https://cdn.skypack.dev/react";
var styles = {
  root: {
    minWidth: 56,
    flexShrink: 0
  },
  alignItemsFlexStart: {
    marginTop: 8
  }
};
var ListItemAvatar = /* @__PURE__ */ forwardRef(function ListItemAvatar2(props, ref) {
  var classes = props.classes, className = props.className, other = _objectWithoutProperties(props, ["classes", "className"]);
  var context = useContext(ListContext_default);
  return /* @__PURE__ */ createElement("div", _extends({
    className: clsx_m_default(classes.root, className, context.alignItems === "flex-start" && classes.alignItemsFlexStart),
    ref
  }, other));
});
false ? ListItemAvatar.propTypes = {
  children: import_prop_types.default.element.isRequired,
  classes: import_prop_types.default.object,
  className: import_prop_types.default.string
} : void 0;
var ListItemAvatar_default = withStyles_default(styles, {
  name: "MuiListItemAvatar"
})(ListItemAvatar);

// src/client/components/List/ListItemAvatar.tsx
var BaseListItemAvatar = (props) => /* @__PURE__ */ React3.createElement(ListItemAvatar_default, {
  ...props
});
var ListItemAvatar3 = styled(BaseListItemAvatar)``;

// src/client/components/List/ListItem.tsx
var ListItem = (props) => /* @__PURE__ */ React.createElement(ListItem_default, {
  dense: true,
  ...props
});
export {
  ButtonListItem,
  List_default as List,
  ListItem,
  ListItemAvatar3 as ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  List_default as default
};
//# sourceMappingURL=list.js.map
