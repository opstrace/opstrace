var __create = Object.create;
var __defProp = Object.defineProperty;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __markAsModule = (target) => __defProp(target, "__esModule", {value: true});
var __commonJS = (callback, module) => () => {
  if (!module) {
    module = {exports: {}};
    callback(module.exports, module);
  }
  return module.exports;
};
var __exportStar = (target, module, desc) => {
  __markAsModule(target);
  if (module && typeof module === "object" || typeof module === "function") {
    for (let key of __getOwnPropNames(module))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, {get: () => module[key], enumerable: !(desc = __getOwnPropDesc(module, key)) || desc.enumerable});
  }
  return target;
};
var __toModule = (module) => {
  if (module && module.__esModule)
    return module;
  return __exportStar(__defProp(module != null ? __create(__getProtoOf(module)) : {}, "default", {value: module, enumerable: true}), module);
};

// ../../node_modules/prop-types/lib/ReactPropTypesSecret.js
var require_ReactPropTypesSecret = __commonJS((exports, module) => {
  "use strict";
  var ReactPropTypesSecret = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
  module.exports = ReactPropTypesSecret;
});

// ../../node_modules/prop-types/factoryWithThrowingShims.js
var require_factoryWithThrowingShims = __commonJS((exports, module) => {
  "use strict";
  var ReactPropTypesSecret = require_ReactPropTypesSecret();
  function emptyFunction() {
  }
  function emptyFunctionWithReset() {
  }
  emptyFunctionWithReset.resetWarningCache = emptyFunction;
  module.exports = function() {
    function shim(props, propName, componentName, location, propFullName, secret) {
      if (secret === ReactPropTypesSecret) {
        return;
      }
      var err = new Error("Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types");
      err.name = "Invariant Violation";
      throw err;
    }
    ;
    shim.isRequired = shim;
    function getShim() {
      return shim;
    }
    ;
    var ReactPropTypes = {
      array: shim,
      bool: shim,
      func: shim,
      number: shim,
      object: shim,
      string: shim,
      symbol: shim,
      any: shim,
      arrayOf: getShim,
      element: shim,
      elementType: shim,
      instanceOf: getShim,
      node: shim,
      objectOf: getShim,
      oneOf: getShim,
      oneOfType: getShim,
      shape: getShim,
      exact: getShim,
      checkPropTypes: emptyFunctionWithReset,
      resetWarningCache: emptyFunction
    };
    ReactPropTypes.PropTypes = ReactPropTypes;
    return ReactPropTypes;
  };
});

// ../../node_modules/prop-types/index.js
var require_prop_types = __commonJS((exports, module) => {
  if (false) {
    ReactIs = null;
    throwOnDirectAccess = true;
    module.exports = null(ReactIs.isElement, throwOnDirectAccess);
  } else {
    module.exports = require_factoryWithThrowingShims()();
  }
  var ReactIs;
  var throwOnDirectAccess;
});

// ../../node_modules/hoist-non-react-statics/node_modules/react-is/cjs/react-is.production.min.js
var require_react_is_production_min = __commonJS((exports) => {
  /** @license React v16.13.1
   * react-is.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  "use strict";
  var b = typeof Symbol === "function" && Symbol.for;
  var c = b ? Symbol.for("react.element") : 60103;
  var d = b ? Symbol.for("react.portal") : 60106;
  var e = b ? Symbol.for("react.fragment") : 60107;
  var f = b ? Symbol.for("react.strict_mode") : 60108;
  var g = b ? Symbol.for("react.profiler") : 60114;
  var h = b ? Symbol.for("react.provider") : 60109;
  var k = b ? Symbol.for("react.context") : 60110;
  var l = b ? Symbol.for("react.async_mode") : 60111;
  var m = b ? Symbol.for("react.concurrent_mode") : 60111;
  var n = b ? Symbol.for("react.forward_ref") : 60112;
  var p = b ? Symbol.for("react.suspense") : 60113;
  var q = b ? Symbol.for("react.suspense_list") : 60120;
  var r = b ? Symbol.for("react.memo") : 60115;
  var t = b ? Symbol.for("react.lazy") : 60116;
  var v = b ? Symbol.for("react.block") : 60121;
  var w = b ? Symbol.for("react.fundamental") : 60117;
  var x = b ? Symbol.for("react.responder") : 60118;
  var y = b ? Symbol.for("react.scope") : 60119;
  function z(a) {
    if (typeof a === "object" && a !== null) {
      var u = a.$$typeof;
      switch (u) {
        case c:
          switch (a = a.type, a) {
            case l:
            case m:
            case e:
            case g:
            case f:
            case p:
              return a;
            default:
              switch (a = a && a.$$typeof, a) {
                case k:
                case n:
                case t:
                case r:
                case h:
                  return a;
                default:
                  return u;
              }
          }
        case d:
          return u;
      }
    }
  }
  function A(a) {
    return z(a) === m;
  }
  exports.AsyncMode = l;
  exports.ConcurrentMode = m;
  exports.ContextConsumer = k;
  exports.ContextProvider = h;
  exports.Element = c;
  exports.ForwardRef = n;
  exports.Fragment = e;
  exports.Lazy = t;
  exports.Memo = r;
  exports.Portal = d;
  exports.Profiler = g;
  exports.StrictMode = f;
  exports.Suspense = p;
  exports.isAsyncMode = function(a) {
    return A(a) || z(a) === l;
  };
  exports.isConcurrentMode = A;
  exports.isContextConsumer = function(a) {
    return z(a) === k;
  };
  exports.isContextProvider = function(a) {
    return z(a) === h;
  };
  exports.isElement = function(a) {
    return typeof a === "object" && a !== null && a.$$typeof === c;
  };
  exports.isForwardRef = function(a) {
    return z(a) === n;
  };
  exports.isFragment = function(a) {
    return z(a) === e;
  };
  exports.isLazy = function(a) {
    return z(a) === t;
  };
  exports.isMemo = function(a) {
    return z(a) === r;
  };
  exports.isPortal = function(a) {
    return z(a) === d;
  };
  exports.isProfiler = function(a) {
    return z(a) === g;
  };
  exports.isStrictMode = function(a) {
    return z(a) === f;
  };
  exports.isSuspense = function(a) {
    return z(a) === p;
  };
  exports.isValidElementType = function(a) {
    return typeof a === "string" || typeof a === "function" || a === e || a === m || a === g || a === f || a === p || a === q || typeof a === "object" && a !== null && (a.$$typeof === t || a.$$typeof === r || a.$$typeof === h || a.$$typeof === k || a.$$typeof === n || a.$$typeof === w || a.$$typeof === x || a.$$typeof === y || a.$$typeof === v);
  };
  exports.typeOf = z;
});

// ../../node_modules/hoist-non-react-statics/node_modules/react-is/index.js
var require_react_is = __commonJS((exports, module) => {
  "use strict";
  if (true) {
    module.exports = require_react_is_production_min();
  } else {
    module.exports = null;
  }
});

// ../../node_modules/hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js
var require_hoist_non_react_statics_cjs = __commonJS((exports, module) => {
  "use strict";
  var reactIs = require_react_is();
  var REACT_STATICS = {
    childContextTypes: true,
    contextType: true,
    contextTypes: true,
    defaultProps: true,
    displayName: true,
    getDefaultProps: true,
    getDerivedStateFromError: true,
    getDerivedStateFromProps: true,
    mixins: true,
    propTypes: true,
    type: true
  };
  var KNOWN_STATICS = {
    name: true,
    length: true,
    prototype: true,
    caller: true,
    callee: true,
    arguments: true,
    arity: true
  };
  var FORWARD_REF_STATICS = {
    $$typeof: true,
    render: true,
    defaultProps: true,
    displayName: true,
    propTypes: true
  };
  var MEMO_STATICS = {
    $$typeof: true,
    compare: true,
    defaultProps: true,
    displayName: true,
    propTypes: true,
    type: true
  };
  var TYPE_STATICS = {};
  TYPE_STATICS[reactIs.ForwardRef] = FORWARD_REF_STATICS;
  TYPE_STATICS[reactIs.Memo] = MEMO_STATICS;
  function getStatics(component) {
    if (reactIs.isMemo(component)) {
      return MEMO_STATICS;
    }
    return TYPE_STATICS[component["$$typeof"]] || REACT_STATICS;
  }
  var defineProperty = Object.defineProperty;
  var getOwnPropertyNames = Object.getOwnPropertyNames;
  var getOwnPropertySymbols = Object.getOwnPropertySymbols;
  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var getPrototypeOf = Object.getPrototypeOf;
  var objectPrototype = Object.prototype;
  function hoistNonReactStatics(targetComponent, sourceComponent, blacklist) {
    if (typeof sourceComponent !== "string") {
      if (objectPrototype) {
        var inheritedComponent = getPrototypeOf(sourceComponent);
        if (inheritedComponent && inheritedComponent !== objectPrototype) {
          hoistNonReactStatics(targetComponent, inheritedComponent, blacklist);
        }
      }
      var keys2 = getOwnPropertyNames(sourceComponent);
      if (getOwnPropertySymbols) {
        keys2 = keys2.concat(getOwnPropertySymbols(sourceComponent));
      }
      var targetStatics = getStatics(targetComponent);
      var sourceStatics = getStatics(sourceComponent);
      for (var i = 0; i < keys2.length; ++i) {
        var key = keys2[i];
        if (!KNOWN_STATICS[key] && !(blacklist && blacklist[key]) && !(sourceStatics && sourceStatics[key]) && !(targetStatics && targetStatics[key])) {
          var descriptor = getOwnPropertyDescriptor(sourceComponent, key);
          try {
            defineProperty(targetComponent, key, descriptor);
          } catch (e) {
          }
        }
      }
    }
    return targetComponent;
  }
  module.exports = hoistNonReactStatics;
});

// ../../node_modules/hyphenate-style-name/index.cjs.js
var require_index_cjs = __commonJS((exports, module) => {
  "use strict";
  var uppercasePattern = /[A-Z]/g;
  var msPattern = /^ms-/;
  var cache2 = {};
  function toHyphenLower(match) {
    return "-" + match.toLowerCase();
  }
  function hyphenateStyleName(name) {
    if (cache2.hasOwnProperty(name)) {
      return cache2[name];
    }
    var hName = name.replace(uppercasePattern, toHyphenLower);
    return cache2[name] = msPattern.test(hName) ? "-" + hName : hName;
  }
  module.exports = hyphenateStyleName;
});

// ../../node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js
function _assertThisInitialized(self2) {
  if (self2 === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return self2;
}

// ../../node_modules/@babel/runtime/helpers/esm/extends.js
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}

// ../../node_modules/@babel/runtime/helpers/esm/inheritsLoose.js
function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  subClass.__proto__ = superClass;
}

// ../../node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null)
    return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0)
      continue;
    target[key] = source[key];
  }
  return target;
}

// ../../node_modules/@babel/runtime/helpers/esm/objectWithoutProperties.js
function _objectWithoutProperties(source, excluded) {
  if (source == null)
    return {};
  var target = _objectWithoutPropertiesLoose(source, excluded);
  var key, i;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0)
        continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key))
        continue;
      target[key] = source[key];
    }
  }
  return target;
}

// ../../node_modules/@babel/runtime/helpers/esm/arrayLikeToArray.js
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length)
    len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }
  return arr2;
}

// ../../node_modules/@babel/runtime/helpers/esm/arrayWithoutHoles.js
function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr))
    return _arrayLikeToArray(arr);
}

// ../../node_modules/@babel/runtime/helpers/esm/iterableToArray.js
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter))
    return Array.from(iter);
}

// ../../node_modules/@babel/runtime/helpers/esm/unsupportedIterableToArray.js
function _unsupportedIterableToArray(o, minLen) {
  if (!o)
    return;
  if (typeof o === "string")
    return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor)
    n = o.constructor.name;
  if (n === "Map" || n === "Set")
    return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
    return _arrayLikeToArray(o, minLen);
}

// ../../node_modules/@babel/runtime/helpers/esm/nonIterableSpread.js
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

// ../../node_modules/@babel/runtime/helpers/esm/toConsumableArray.js
function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}

// ../../node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function _typeof3(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function _typeof3(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}

// ../../node_modules/@material-ui/utils/esm/deepmerge.js
function isPlainObject(item) {
  return item && _typeof(item) === "object" && item.constructor === Object;
}
function deepmerge(target, source) {
  var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {
    clone: true
  };
  var output = options.clone ? _extends({}, target) : target;
  if (isPlainObject(target) && isPlainObject(source)) {
    Object.keys(source).forEach(function(key) {
      if (key === "__proto__") {
        return;
      }
      if (isPlainObject(source[key]) && key in target) {
        output[key] = deepmerge(target[key], source[key], options);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

// ../../node_modules/@babel/runtime/helpers/esm/defineProperty.js
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

// ../../node_modules/@material-ui/utils/esm/formatMuiErrorMessage.js
function formatMuiErrorMessage(code) {
  var url = "https://material-ui.com/production-error/?code=" + code;
  for (var i = 1; i < arguments.length; i += 1) {
    url += "&args[]=" + encodeURIComponent(arguments[i]);
  }
  return "Minified Material-UI error #" + code + "; visit " + url + " for the full message.";
}

// ../../node_modules/@material-ui/utils/esm/index.js
/** @license Material-UI v4.11.2
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// ../../node_modules/clsx/dist/clsx.m.js
function toVal(mix) {
  var k, y, str = "";
  if (typeof mix === "string" || typeof mix === "number") {
    str += mix;
  } else if (typeof mix === "object") {
    if (Array.isArray(mix)) {
      for (k = 0; k < mix.length; k++) {
        if (mix[k]) {
          if (y = toVal(mix[k])) {
            str && (str += " ");
            str += y;
          }
        }
      }
    } else {
      for (k in mix) {
        if (mix[k]) {
          str && (str += " ");
          str += k;
        }
      }
    }
  }
  return str;
}
function clsx_m_default() {
  var i = 0, tmp, x, str = "";
  while (i < arguments.length) {
    if (tmp = arguments[i++]) {
      if (x = toVal(tmp)) {
        str && (str += " ");
        str += x;
      }
    }
  }
  return str;
}

// ../../node_modules/is-in-browser/dist/module.js
var _typeof2 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function(obj) {
  return typeof obj;
} : function(obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};
var isBrowser = (typeof window === "undefined" ? "undefined" : _typeof2(window)) === "object" && (typeof document === "undefined" ? "undefined" : _typeof2(document)) === "object" && document.nodeType === 9;
var module_default = isBrowser;

// ../../node_modules/@babel/runtime/helpers/esm/createClass.js
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor)
      descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps)
    _defineProperties(Constructor.prototype, protoProps);
  if (staticProps)
    _defineProperties(Constructor, staticProps);
  return Constructor;
}

// ../../node_modules/jss/dist/jss.esm.js
var plainObjectConstrurctor = {}.constructor;
function cloneStyle(style) {
  if (style == null || typeof style !== "object")
    return style;
  if (Array.isArray(style))
    return style.map(cloneStyle);
  if (style.constructor !== plainObjectConstrurctor)
    return style;
  var newStyle = {};
  for (var name in style) {
    newStyle[name] = cloneStyle(style[name]);
  }
  return newStyle;
}
function createRule(name, decl, options) {
  if (name === void 0) {
    name = "unnamed";
  }
  var jss3 = options.jss;
  var declCopy = cloneStyle(decl);
  var rule = jss3.plugins.onCreateRule(name, declCopy, options);
  if (rule)
    return rule;
  if (name[0] === "@") {
    false ? tiny_warning_esm_default(false, "[JSS] Unknown rule " + name) : void 0;
  }
  return null;
}
var join = function join2(value, by) {
  var result = "";
  for (var i = 0; i < value.length; i++) {
    if (value[i] === "!important")
      break;
    if (result)
      result += by;
    result += value[i];
  }
  return result;
};
var toCssValue = function toCssValue2(value, ignoreImportant) {
  if (ignoreImportant === void 0) {
    ignoreImportant = false;
  }
  if (!Array.isArray(value))
    return value;
  var cssValue = "";
  if (Array.isArray(value[0])) {
    for (var i = 0; i < value.length; i++) {
      if (value[i] === "!important")
        break;
      if (cssValue)
        cssValue += ", ";
      cssValue += join(value[i], " ");
    }
  } else
    cssValue = join(value, ", ");
  if (!ignoreImportant && value[value.length - 1] === "!important") {
    cssValue += " !important";
  }
  return cssValue;
};
function indentStr(str, indent) {
  var result = "";
  for (var index = 0; index < indent; index++) {
    result += "  ";
  }
  return result + str;
}
function toCss(selector, style, options) {
  if (options === void 0) {
    options = {};
  }
  var result = "";
  if (!style)
    return result;
  var _options = options, _options$indent = _options.indent, indent = _options$indent === void 0 ? 0 : _options$indent;
  var fallbacks = style.fallbacks;
  if (selector)
    indent++;
  if (fallbacks) {
    if (Array.isArray(fallbacks)) {
      for (var index = 0; index < fallbacks.length; index++) {
        var fallback = fallbacks[index];
        for (var prop in fallback) {
          var value = fallback[prop];
          if (value != null) {
            if (result)
              result += "\n";
            result += "" + indentStr(prop + ": " + toCssValue(value) + ";", indent);
          }
        }
      }
    } else {
      for (var _prop in fallbacks) {
        var _value = fallbacks[_prop];
        if (_value != null) {
          if (result)
            result += "\n";
          result += "" + indentStr(_prop + ": " + toCssValue(_value) + ";", indent);
        }
      }
    }
  }
  for (var _prop2 in style) {
    var _value2 = style[_prop2];
    if (_value2 != null && _prop2 !== "fallbacks") {
      if (result)
        result += "\n";
      result += "" + indentStr(_prop2 + ": " + toCssValue(_value2) + ";", indent);
    }
  }
  if (!result && !options.allowEmpty)
    return result;
  if (!selector)
    return result;
  indent--;
  if (result)
    result = "\n" + result + "\n";
  return indentStr(selector + " {" + result, indent) + indentStr("}", indent);
}
var escapeRegex = /([[\].#*$><+~=|^:(),"'`\s])/g;
var nativeEscape = typeof CSS !== "undefined" && CSS.escape;
var escape = function(str) {
  return nativeEscape ? nativeEscape(str) : str.replace(escapeRegex, "\\$1");
};
var BaseStyleRule = /* @__PURE__ */ function() {
  function BaseStyleRule2(key, style, options) {
    this.type = "style";
    this.key = void 0;
    this.isProcessed = false;
    this.style = void 0;
    this.renderer = void 0;
    this.renderable = void 0;
    this.options = void 0;
    var sheet = options.sheet, Renderer = options.Renderer;
    this.key = key;
    this.options = options;
    this.style = style;
    if (sheet)
      this.renderer = sheet.renderer;
    else if (Renderer)
      this.renderer = new Renderer();
  }
  var _proto = BaseStyleRule2.prototype;
  _proto.prop = function prop(name, value, options) {
    if (value === void 0)
      return this.style[name];
    var force = options ? options.force : false;
    if (!force && this.style[name] === value)
      return this;
    var newValue = value;
    if (!options || options.process !== false) {
      newValue = this.options.jss.plugins.onChangeValue(value, name, this);
    }
    var isEmpty = newValue == null || newValue === false;
    var isDefined = name in this.style;
    if (isEmpty && !isDefined && !force)
      return this;
    var remove = isEmpty && isDefined;
    if (remove)
      delete this.style[name];
    else
      this.style[name] = newValue;
    if (this.renderable && this.renderer) {
      if (remove)
        this.renderer.removeProperty(this.renderable, name);
      else
        this.renderer.setProperty(this.renderable, name, newValue);
      return this;
    }
    var sheet = this.options.sheet;
    if (sheet && sheet.attached) {
      false ? tiny_warning_esm_default(false, '[JSS] Rule is not linked. Missing sheet option "link: true".') : void 0;
    }
    return this;
  };
  return BaseStyleRule2;
}();
var StyleRule = /* @__PURE__ */ function(_BaseStyleRule) {
  _inheritsLoose(StyleRule2, _BaseStyleRule);
  function StyleRule2(key, style, options) {
    var _this;
    _this = _BaseStyleRule.call(this, key, style, options) || this;
    _this.selectorText = void 0;
    _this.id = void 0;
    _this.renderable = void 0;
    var selector = options.selector, scoped = options.scoped, sheet = options.sheet, generateId = options.generateId;
    if (selector) {
      _this.selectorText = selector;
    } else if (scoped !== false) {
      _this.id = generateId(_assertThisInitialized(_assertThisInitialized(_this)), sheet);
      _this.selectorText = "." + escape(_this.id);
    }
    return _this;
  }
  var _proto2 = StyleRule2.prototype;
  _proto2.applyTo = function applyTo(renderable) {
    var renderer = this.renderer;
    if (renderer) {
      var json = this.toJSON();
      for (var prop in json) {
        renderer.setProperty(renderable, prop, json[prop]);
      }
    }
    return this;
  };
  _proto2.toJSON = function toJSON() {
    var json = {};
    for (var prop in this.style) {
      var value = this.style[prop];
      if (typeof value !== "object")
        json[prop] = value;
      else if (Array.isArray(value))
        json[prop] = toCssValue(value);
    }
    return json;
  };
  _proto2.toString = function toString(options) {
    var sheet = this.options.sheet;
    var link = sheet ? sheet.options.link : false;
    var opts = link ? _extends({}, options, {
      allowEmpty: true
    }) : options;
    return toCss(this.selectorText, this.style, opts);
  };
  _createClass(StyleRule2, [{
    key: "selector",
    set: function set2(selector) {
      if (selector === this.selectorText)
        return;
      this.selectorText = selector;
      var renderer = this.renderer, renderable = this.renderable;
      if (!renderable || !renderer)
        return;
      var hasChanged = renderer.setSelector(renderable, selector);
      if (!hasChanged) {
        renderer.replaceRule(renderable, this);
      }
    },
    get: function get2() {
      return this.selectorText;
    }
  }]);
  return StyleRule2;
}(BaseStyleRule);
var pluginStyleRule = {
  onCreateRule: function onCreateRule(name, style, options) {
    if (name[0] === "@" || options.parent && options.parent.type === "keyframes") {
      return null;
    }
    return new StyleRule(name, style, options);
  }
};
var defaultToStringOptions = {
  indent: 1,
  children: true
};
var atRegExp = /@([\w-]+)/;
var ConditionalRule = /* @__PURE__ */ function() {
  function ConditionalRule2(key, styles, options) {
    this.type = "conditional";
    this.at = void 0;
    this.key = void 0;
    this.query = void 0;
    this.rules = void 0;
    this.options = void 0;
    this.isProcessed = false;
    this.renderable = void 0;
    this.key = key;
    var atMatch = key.match(atRegExp);
    this.at = atMatch ? atMatch[1] : "unknown";
    this.query = options.name || "@" + this.at;
    this.options = options;
    this.rules = new RuleList(_extends({}, options, {
      parent: this
    }));
    for (var name in styles) {
      this.rules.add(name, styles[name]);
    }
    this.rules.process();
  }
  var _proto = ConditionalRule2.prototype;
  _proto.getRule = function getRule(name) {
    return this.rules.get(name);
  };
  _proto.indexOf = function indexOf(rule) {
    return this.rules.indexOf(rule);
  };
  _proto.addRule = function addRule(name, style, options) {
    var rule = this.rules.add(name, style, options);
    if (!rule)
      return null;
    this.options.jss.plugins.onProcessRule(rule);
    return rule;
  };
  _proto.toString = function toString(options) {
    if (options === void 0) {
      options = defaultToStringOptions;
    }
    if (options.indent == null)
      options.indent = defaultToStringOptions.indent;
    if (options.children == null)
      options.children = defaultToStringOptions.children;
    if (options.children === false) {
      return this.query + " {}";
    }
    var children = this.rules.toString(options);
    return children ? this.query + " {\n" + children + "\n}" : "";
  };
  return ConditionalRule2;
}();
var keyRegExp = /@media|@supports\s+/;
var pluginConditionalRule = {
  onCreateRule: function onCreateRule2(key, styles, options) {
    return keyRegExp.test(key) ? new ConditionalRule(key, styles, options) : null;
  }
};
var defaultToStringOptions$1 = {
  indent: 1,
  children: true
};
var nameRegExp = /@keyframes\s+([\w-]+)/;
var KeyframesRule = /* @__PURE__ */ function() {
  function KeyframesRule2(key, frames, options) {
    this.type = "keyframes";
    this.at = "@keyframes";
    this.key = void 0;
    this.name = void 0;
    this.id = void 0;
    this.rules = void 0;
    this.options = void 0;
    this.isProcessed = false;
    this.renderable = void 0;
    var nameMatch = key.match(nameRegExp);
    if (nameMatch && nameMatch[1]) {
      this.name = nameMatch[1];
    } else {
      this.name = "noname";
      false ? tiny_warning_esm_default(false, "[JSS] Bad keyframes name " + key) : void 0;
    }
    this.key = this.type + "-" + this.name;
    this.options = options;
    var scoped = options.scoped, sheet = options.sheet, generateId = options.generateId;
    this.id = scoped === false ? this.name : escape(generateId(this, sheet));
    this.rules = new RuleList(_extends({}, options, {
      parent: this
    }));
    for (var name in frames) {
      this.rules.add(name, frames[name], _extends({}, options, {
        parent: this
      }));
    }
    this.rules.process();
  }
  var _proto = KeyframesRule2.prototype;
  _proto.toString = function toString(options) {
    if (options === void 0) {
      options = defaultToStringOptions$1;
    }
    if (options.indent == null)
      options.indent = defaultToStringOptions$1.indent;
    if (options.children == null)
      options.children = defaultToStringOptions$1.children;
    if (options.children === false) {
      return this.at + " " + this.id + " {}";
    }
    var children = this.rules.toString(options);
    if (children)
      children = "\n" + children + "\n";
    return this.at + " " + this.id + " {" + children + "}";
  };
  return KeyframesRule2;
}();
var keyRegExp$1 = /@keyframes\s+/;
var refRegExp = /\$([\w-]+)/g;
var findReferencedKeyframe = function findReferencedKeyframe2(val, keyframes) {
  if (typeof val === "string") {
    return val.replace(refRegExp, function(match, name) {
      if (name in keyframes) {
        return keyframes[name];
      }
      false ? tiny_warning_esm_default(false, '[JSS] Referenced keyframes rule "' + name + '" is not defined.') : void 0;
      return match;
    });
  }
  return val;
};
var replaceRef = function replaceRef2(style, prop, keyframes) {
  var value = style[prop];
  var refKeyframe = findReferencedKeyframe(value, keyframes);
  if (refKeyframe !== value) {
    style[prop] = refKeyframe;
  }
};
var plugin = {
  onCreateRule: function onCreateRule3(key, frames, options) {
    return typeof key === "string" && keyRegExp$1.test(key) ? new KeyframesRule(key, frames, options) : null;
  },
  onProcessStyle: function onProcessStyle(style, rule, sheet) {
    if (rule.type !== "style" || !sheet)
      return style;
    if ("animation-name" in style)
      replaceRef(style, "animation-name", sheet.keyframes);
    if ("animation" in style)
      replaceRef(style, "animation", sheet.keyframes);
    return style;
  },
  onChangeValue: function onChangeValue(val, prop, rule) {
    var sheet = rule.options.sheet;
    if (!sheet) {
      return val;
    }
    switch (prop) {
      case "animation":
        return findReferencedKeyframe(val, sheet.keyframes);
      case "animation-name":
        return findReferencedKeyframe(val, sheet.keyframes);
      default:
        return val;
    }
  }
};
var KeyframeRule = /* @__PURE__ */ function(_BaseStyleRule) {
  _inheritsLoose(KeyframeRule2, _BaseStyleRule);
  function KeyframeRule2() {
    var _this;
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    _this = _BaseStyleRule.call.apply(_BaseStyleRule, [this].concat(args)) || this;
    _this.renderable = void 0;
    return _this;
  }
  var _proto = KeyframeRule2.prototype;
  _proto.toString = function toString(options) {
    var sheet = this.options.sheet;
    var link = sheet ? sheet.options.link : false;
    var opts = link ? _extends({}, options, {
      allowEmpty: true
    }) : options;
    return toCss(this.key, this.style, opts);
  };
  return KeyframeRule2;
}(BaseStyleRule);
var pluginKeyframeRule = {
  onCreateRule: function onCreateRule4(key, style, options) {
    if (options.parent && options.parent.type === "keyframes") {
      return new KeyframeRule(key, style, options);
    }
    return null;
  }
};
var FontFaceRule = /* @__PURE__ */ function() {
  function FontFaceRule2(key, style, options) {
    this.type = "font-face";
    this.at = "@font-face";
    this.key = void 0;
    this.style = void 0;
    this.options = void 0;
    this.isProcessed = false;
    this.renderable = void 0;
    this.key = key;
    this.style = style;
    this.options = options;
  }
  var _proto = FontFaceRule2.prototype;
  _proto.toString = function toString(options) {
    if (Array.isArray(this.style)) {
      var str = "";
      for (var index = 0; index < this.style.length; index++) {
        str += toCss(this.at, this.style[index]);
        if (this.style[index + 1])
          str += "\n";
      }
      return str;
    }
    return toCss(this.at, this.style, options);
  };
  return FontFaceRule2;
}();
var keyRegExp$2 = /@font-face/;
var pluginFontFaceRule = {
  onCreateRule: function onCreateRule5(key, style, options) {
    return keyRegExp$2.test(key) ? new FontFaceRule(key, style, options) : null;
  }
};
var ViewportRule = /* @__PURE__ */ function() {
  function ViewportRule2(key, style, options) {
    this.type = "viewport";
    this.at = "@viewport";
    this.key = void 0;
    this.style = void 0;
    this.options = void 0;
    this.isProcessed = false;
    this.renderable = void 0;
    this.key = key;
    this.style = style;
    this.options = options;
  }
  var _proto = ViewportRule2.prototype;
  _proto.toString = function toString(options) {
    return toCss(this.key, this.style, options);
  };
  return ViewportRule2;
}();
var pluginViewportRule = {
  onCreateRule: function onCreateRule6(key, style, options) {
    return key === "@viewport" || key === "@-ms-viewport" ? new ViewportRule(key, style, options) : null;
  }
};
var SimpleRule = /* @__PURE__ */ function() {
  function SimpleRule2(key, value, options) {
    this.type = "simple";
    this.key = void 0;
    this.value = void 0;
    this.options = void 0;
    this.isProcessed = false;
    this.renderable = void 0;
    this.key = key;
    this.value = value;
    this.options = options;
  }
  var _proto = SimpleRule2.prototype;
  _proto.toString = function toString(options) {
    if (Array.isArray(this.value)) {
      var str = "";
      for (var index = 0; index < this.value.length; index++) {
        str += this.key + " " + this.value[index] + ";";
        if (this.value[index + 1])
          str += "\n";
      }
      return str;
    }
    return this.key + " " + this.value + ";";
  };
  return SimpleRule2;
}();
var keysMap = {
  "@charset": true,
  "@import": true,
  "@namespace": true
};
var pluginSimpleRule = {
  onCreateRule: function onCreateRule7(key, value, options) {
    return key in keysMap ? new SimpleRule(key, value, options) : null;
  }
};
var plugins = [pluginStyleRule, pluginConditionalRule, plugin, pluginKeyframeRule, pluginFontFaceRule, pluginViewportRule, pluginSimpleRule];
var defaultUpdateOptions = {
  process: true
};
var forceUpdateOptions = {
  force: true,
  process: true
};
var RuleList = /* @__PURE__ */ function() {
  function RuleList2(options) {
    this.map = {};
    this.raw = {};
    this.index = [];
    this.counter = 0;
    this.options = void 0;
    this.classes = void 0;
    this.keyframes = void 0;
    this.options = options;
    this.classes = options.classes;
    this.keyframes = options.keyframes;
  }
  var _proto = RuleList2.prototype;
  _proto.add = function add(name, decl, ruleOptions) {
    var _this$options = this.options, parent = _this$options.parent, sheet = _this$options.sheet, jss3 = _this$options.jss, Renderer = _this$options.Renderer, generateId = _this$options.generateId, scoped = _this$options.scoped;
    var options = _extends({
      classes: this.classes,
      parent,
      sheet,
      jss: jss3,
      Renderer,
      generateId,
      scoped,
      name,
      keyframes: this.keyframes,
      selector: void 0
    }, ruleOptions);
    var key = name;
    if (name in this.raw) {
      key = name + "-d" + this.counter++;
    }
    this.raw[key] = decl;
    if (key in this.classes) {
      options.selector = "." + escape(this.classes[key]);
    }
    var rule = createRule(key, decl, options);
    if (!rule)
      return null;
    this.register(rule);
    var index = options.index === void 0 ? this.index.length : options.index;
    this.index.splice(index, 0, rule);
    return rule;
  };
  _proto.get = function get2(name) {
    return this.map[name];
  };
  _proto.remove = function remove(rule) {
    this.unregister(rule);
    delete this.raw[rule.key];
    this.index.splice(this.index.indexOf(rule), 1);
  };
  _proto.indexOf = function indexOf(rule) {
    return this.index.indexOf(rule);
  };
  _proto.process = function process2() {
    var plugins3 = this.options.jss.plugins;
    this.index.slice(0).forEach(plugins3.onProcessRule, plugins3);
  };
  _proto.register = function register(rule) {
    this.map[rule.key] = rule;
    if (rule instanceof StyleRule) {
      this.map[rule.selector] = rule;
      if (rule.id)
        this.classes[rule.key] = rule.id;
    } else if (rule instanceof KeyframesRule && this.keyframes) {
      this.keyframes[rule.name] = rule.id;
    }
  };
  _proto.unregister = function unregister(rule) {
    delete this.map[rule.key];
    if (rule instanceof StyleRule) {
      delete this.map[rule.selector];
      delete this.classes[rule.key];
    } else if (rule instanceof KeyframesRule) {
      delete this.keyframes[rule.name];
    }
  };
  _proto.update = function update2() {
    var name;
    var data;
    var options;
    if (typeof (arguments.length <= 0 ? void 0 : arguments[0]) === "string") {
      name = arguments.length <= 0 ? void 0 : arguments[0];
      data = arguments.length <= 1 ? void 0 : arguments[1];
      options = arguments.length <= 2 ? void 0 : arguments[2];
    } else {
      data = arguments.length <= 0 ? void 0 : arguments[0];
      options = arguments.length <= 1 ? void 0 : arguments[1];
      name = null;
    }
    if (name) {
      this.updateOne(this.map[name], data, options);
    } else {
      for (var index = 0; index < this.index.length; index++) {
        this.updateOne(this.index[index], data, options);
      }
    }
  };
  _proto.updateOne = function updateOne(rule, data, options) {
    if (options === void 0) {
      options = defaultUpdateOptions;
    }
    var _this$options2 = this.options, plugins3 = _this$options2.jss.plugins, sheet = _this$options2.sheet;
    if (rule.rules instanceof RuleList2) {
      rule.rules.update(data, options);
      return;
    }
    var styleRule = rule;
    var style = styleRule.style;
    plugins3.onUpdate(data, rule, sheet, options);
    if (options.process && style && style !== styleRule.style) {
      plugins3.onProcessStyle(styleRule.style, styleRule, sheet);
      for (var prop in styleRule.style) {
        var nextValue = styleRule.style[prop];
        var prevValue = style[prop];
        if (nextValue !== prevValue) {
          styleRule.prop(prop, nextValue, forceUpdateOptions);
        }
      }
      for (var _prop in style) {
        var _nextValue = styleRule.style[_prop];
        var _prevValue = style[_prop];
        if (_nextValue == null && _nextValue !== _prevValue) {
          styleRule.prop(_prop, null, forceUpdateOptions);
        }
      }
    }
  };
  _proto.toString = function toString(options) {
    var str = "";
    var sheet = this.options.sheet;
    var link = sheet ? sheet.options.link : false;
    for (var index = 0; index < this.index.length; index++) {
      var rule = this.index[index];
      var css2 = rule.toString(options);
      if (!css2 && !link)
        continue;
      if (str)
        str += "\n";
      str += css2;
    }
    return str;
  };
  return RuleList2;
}();
var StyleSheet = /* @__PURE__ */ function() {
  function StyleSheet2(styles, options) {
    this.options = void 0;
    this.deployed = void 0;
    this.attached = void 0;
    this.rules = void 0;
    this.renderer = void 0;
    this.classes = void 0;
    this.keyframes = void 0;
    this.queue = void 0;
    this.attached = false;
    this.deployed = false;
    this.classes = {};
    this.keyframes = {};
    this.options = _extends({}, options, {
      sheet: this,
      parent: this,
      classes: this.classes,
      keyframes: this.keyframes
    });
    if (options.Renderer) {
      this.renderer = new options.Renderer(this);
    }
    this.rules = new RuleList(this.options);
    for (var name in styles) {
      this.rules.add(name, styles[name]);
    }
    this.rules.process();
  }
  var _proto = StyleSheet2.prototype;
  _proto.attach = function attach2() {
    if (this.attached)
      return this;
    if (this.renderer)
      this.renderer.attach();
    this.attached = true;
    if (!this.deployed)
      this.deploy();
    return this;
  };
  _proto.detach = function detach2() {
    if (!this.attached)
      return this;
    if (this.renderer)
      this.renderer.detach();
    this.attached = false;
    return this;
  };
  _proto.addRule = function addRule(name, decl, options) {
    var queue = this.queue;
    if (this.attached && !queue)
      this.queue = [];
    var rule = this.rules.add(name, decl, options);
    if (!rule)
      return null;
    this.options.jss.plugins.onProcessRule(rule);
    if (this.attached) {
      if (!this.deployed)
        return rule;
      if (queue)
        queue.push(rule);
      else {
        this.insertRule(rule);
        if (this.queue) {
          this.queue.forEach(this.insertRule, this);
          this.queue = void 0;
        }
      }
      return rule;
    }
    this.deployed = false;
    return rule;
  };
  _proto.insertRule = function insertRule2(rule) {
    if (this.renderer) {
      this.renderer.insertRule(rule);
    }
  };
  _proto.addRules = function addRules(styles, options) {
    var added = [];
    for (var name in styles) {
      var rule = this.addRule(name, styles[name], options);
      if (rule)
        added.push(rule);
    }
    return added;
  };
  _proto.getRule = function getRule(name) {
    return this.rules.get(name);
  };
  _proto.deleteRule = function deleteRule(name) {
    var rule = typeof name === "object" ? name : this.rules.get(name);
    if (!rule || this.attached && !rule.renderable) {
      return false;
    }
    this.rules.remove(rule);
    if (this.attached && rule.renderable && this.renderer) {
      return this.renderer.deleteRule(rule.renderable);
    }
    return true;
  };
  _proto.indexOf = function indexOf(rule) {
    return this.rules.indexOf(rule);
  };
  _proto.deploy = function deploy() {
    if (this.renderer)
      this.renderer.deploy();
    this.deployed = true;
    return this;
  };
  _proto.update = function update2() {
    var _this$rules;
    (_this$rules = this.rules).update.apply(_this$rules, arguments);
    return this;
  };
  _proto.updateOne = function updateOne(rule, data, options) {
    this.rules.updateOne(rule, data, options);
    return this;
  };
  _proto.toString = function toString(options) {
    return this.rules.toString(options);
  };
  return StyleSheet2;
}();
var PluginsRegistry = /* @__PURE__ */ function() {
  function PluginsRegistry2() {
    this.plugins = {
      internal: [],
      external: []
    };
    this.registry = void 0;
  }
  var _proto = PluginsRegistry2.prototype;
  _proto.onCreateRule = function onCreateRule8(name, decl, options) {
    for (var i = 0; i < this.registry.onCreateRule.length; i++) {
      var rule = this.registry.onCreateRule[i](name, decl, options);
      if (rule)
        return rule;
    }
    return null;
  };
  _proto.onProcessRule = function onProcessRule(rule) {
    if (rule.isProcessed)
      return;
    var sheet = rule.options.sheet;
    for (var i = 0; i < this.registry.onProcessRule.length; i++) {
      this.registry.onProcessRule[i](rule, sheet);
    }
    if (rule.style)
      this.onProcessStyle(rule.style, rule, sheet);
    rule.isProcessed = true;
  };
  _proto.onProcessStyle = function onProcessStyle2(style, rule, sheet) {
    for (var i = 0; i < this.registry.onProcessStyle.length; i++) {
      rule.style = this.registry.onProcessStyle[i](rule.style, rule, sheet);
    }
  };
  _proto.onProcessSheet = function onProcessSheet(sheet) {
    for (var i = 0; i < this.registry.onProcessSheet.length; i++) {
      this.registry.onProcessSheet[i](sheet);
    }
  };
  _proto.onUpdate = function onUpdate(data, rule, sheet, options) {
    for (var i = 0; i < this.registry.onUpdate.length; i++) {
      this.registry.onUpdate[i](data, rule, sheet, options);
    }
  };
  _proto.onChangeValue = function onChangeValue2(value, prop, rule) {
    var processedValue = value;
    for (var i = 0; i < this.registry.onChangeValue.length; i++) {
      processedValue = this.registry.onChangeValue[i](processedValue, prop, rule);
    }
    return processedValue;
  };
  _proto.use = function use(newPlugin, options) {
    if (options === void 0) {
      options = {
        queue: "external"
      };
    }
    var plugins3 = this.plugins[options.queue];
    if (plugins3.indexOf(newPlugin) !== -1) {
      return;
    }
    plugins3.push(newPlugin);
    this.registry = [].concat(this.plugins.external, this.plugins.internal).reduce(function(registry2, plugin2) {
      for (var name in plugin2) {
        if (name in registry2) {
          registry2[name].push(plugin2[name]);
        } else {
          false ? tiny_warning_esm_default(false, '[JSS] Unknown hook "' + name + '".') : void 0;
        }
      }
      return registry2;
    }, {
      onCreateRule: [],
      onProcessRule: [],
      onProcessStyle: [],
      onProcessSheet: [],
      onChangeValue: [],
      onUpdate: []
    });
  };
  return PluginsRegistry2;
}();
var SheetsRegistry = /* @__PURE__ */ function() {
  function SheetsRegistry2() {
    this.registry = [];
  }
  var _proto = SheetsRegistry2.prototype;
  _proto.add = function add(sheet) {
    var registry2 = this.registry;
    var index = sheet.options.index;
    if (registry2.indexOf(sheet) !== -1)
      return;
    if (registry2.length === 0 || index >= this.index) {
      registry2.push(sheet);
      return;
    }
    for (var i = 0; i < registry2.length; i++) {
      if (registry2[i].options.index > index) {
        registry2.splice(i, 0, sheet);
        return;
      }
    }
  };
  _proto.reset = function reset() {
    this.registry = [];
  };
  _proto.remove = function remove(sheet) {
    var index = this.registry.indexOf(sheet);
    this.registry.splice(index, 1);
  };
  _proto.toString = function toString(_temp) {
    var _ref = _temp === void 0 ? {} : _temp, attached = _ref.attached, options = _objectWithoutPropertiesLoose(_ref, ["attached"]);
    var css2 = "";
    for (var i = 0; i < this.registry.length; i++) {
      var sheet = this.registry[i];
      if (attached != null && sheet.attached !== attached) {
        continue;
      }
      if (css2)
        css2 += "\n";
      css2 += sheet.toString(options);
    }
    return css2;
  };
  _createClass(SheetsRegistry2, [{
    key: "index",
    get: function get2() {
      return this.registry.length === 0 ? 0 : this.registry[this.registry.length - 1].options.index;
    }
  }]);
  return SheetsRegistry2;
}();
var registry = new SheetsRegistry();
var globalThis = typeof window != "undefined" && window.Math == Math ? window : typeof self != "undefined" && self.Math == Math ? self : Function("return this")();
var ns = "2f1acc6c3a606b082e5eef5e54414ffb";
if (globalThis[ns] == null)
  globalThis[ns] = 0;
var moduleId = globalThis[ns]++;
var maxRules = 1e10;
var createGenerateId = function createGenerateId2(options) {
  if (options === void 0) {
    options = {};
  }
  var ruleCounter = 0;
  return function(rule, sheet) {
    ruleCounter += 1;
    if (ruleCounter > maxRules) {
      false ? tiny_warning_esm_default(false, "[JSS] You might have a memory leak. Rule counter is at " + ruleCounter + ".") : void 0;
    }
    var jssId = "";
    var prefix2 = "";
    if (sheet) {
      if (sheet.options.classNamePrefix) {
        prefix2 = sheet.options.classNamePrefix;
      }
      if (sheet.options.jss.id != null) {
        jssId = String(sheet.options.jss.id);
      }
    }
    if (options.minify) {
      return "" + (prefix2 || "c") + moduleId + jssId + ruleCounter;
    }
    return prefix2 + rule.key + "-" + moduleId + (jssId ? "-" + jssId : "") + "-" + ruleCounter;
  };
};
var memoize = function memoize2(fn) {
  var value;
  return function() {
    if (!value)
      value = fn();
    return value;
  };
};
var getPropertyValue = function getPropertyValue2(cssRule, prop) {
  try {
    if (cssRule.attributeStyleMap) {
      return cssRule.attributeStyleMap.get(prop);
    }
    return cssRule.style.getPropertyValue(prop);
  } catch (err) {
    return "";
  }
};
var setProperty = function setProperty2(cssRule, prop, value) {
  try {
    var cssValue = value;
    if (Array.isArray(value)) {
      cssValue = toCssValue(value, true);
      if (value[value.length - 1] === "!important") {
        cssRule.style.setProperty(prop, cssValue, "important");
        return true;
      }
    }
    if (cssRule.attributeStyleMap) {
      cssRule.attributeStyleMap.set(prop, cssValue);
    } else {
      cssRule.style.setProperty(prop, cssValue);
    }
  } catch (err) {
    return false;
  }
  return true;
};
var removeProperty = function removeProperty2(cssRule, prop) {
  try {
    if (cssRule.attributeStyleMap) {
      cssRule.attributeStyleMap.delete(prop);
    } else {
      cssRule.style.removeProperty(prop);
    }
  } catch (err) {
    false ? tiny_warning_esm_default(false, '[JSS] DOMException "' + err.message + '" was thrown. Tried to remove property "' + prop + '".') : void 0;
  }
};
var setSelector = function setSelector2(cssRule, selectorText) {
  cssRule.selectorText = selectorText;
  return cssRule.selectorText === selectorText;
};
var getHead = memoize(function() {
  return document.querySelector("head");
});
function findHigherSheet(registry2, options) {
  for (var i = 0; i < registry2.length; i++) {
    var sheet = registry2[i];
    if (sheet.attached && sheet.options.index > options.index && sheet.options.insertionPoint === options.insertionPoint) {
      return sheet;
    }
  }
  return null;
}
function findHighestSheet(registry2, options) {
  for (var i = registry2.length - 1; i >= 0; i--) {
    var sheet = registry2[i];
    if (sheet.attached && sheet.options.insertionPoint === options.insertionPoint) {
      return sheet;
    }
  }
  return null;
}
function findCommentNode(text) {
  var head = getHead();
  for (var i = 0; i < head.childNodes.length; i++) {
    var node = head.childNodes[i];
    if (node.nodeType === 8 && node.nodeValue.trim() === text) {
      return node;
    }
  }
  return null;
}
function findPrevNode(options) {
  var registry$1 = registry.registry;
  if (registry$1.length > 0) {
    var sheet = findHigherSheet(registry$1, options);
    if (sheet && sheet.renderer) {
      return {
        parent: sheet.renderer.element.parentNode,
        node: sheet.renderer.element
      };
    }
    sheet = findHighestSheet(registry$1, options);
    if (sheet && sheet.renderer) {
      return {
        parent: sheet.renderer.element.parentNode,
        node: sheet.renderer.element.nextSibling
      };
    }
  }
  var insertionPoint = options.insertionPoint;
  if (insertionPoint && typeof insertionPoint === "string") {
    var comment = findCommentNode(insertionPoint);
    if (comment) {
      return {
        parent: comment.parentNode,
        node: comment.nextSibling
      };
    }
    false ? tiny_warning_esm_default(false, '[JSS] Insertion point "' + insertionPoint + '" not found.') : void 0;
  }
  return false;
}
function insertStyle(style, options) {
  var insertionPoint = options.insertionPoint;
  var nextNode = findPrevNode(options);
  if (nextNode !== false && nextNode.parent) {
    nextNode.parent.insertBefore(style, nextNode.node);
    return;
  }
  if (insertionPoint && typeof insertionPoint.nodeType === "number") {
    var insertionPointElement = insertionPoint;
    var parentNode = insertionPointElement.parentNode;
    if (parentNode)
      parentNode.insertBefore(style, insertionPointElement.nextSibling);
    else
      false ? tiny_warning_esm_default(false, "[JSS] Insertion point is not in the DOM.") : void 0;
    return;
  }
  getHead().appendChild(style);
}
var getNonce = memoize(function() {
  var node = document.querySelector('meta[property="csp-nonce"]');
  return node ? node.getAttribute("content") : null;
});
var _insertRule = function insertRule(container, rule, index) {
  try {
    if ("insertRule" in container) {
      var c = container;
      c.insertRule(rule, index);
    } else if ("appendRule" in container) {
      var _c = container;
      _c.appendRule(rule);
    }
  } catch (err) {
    false ? tiny_warning_esm_default(false, "[JSS] " + err.message) : void 0;
    return false;
  }
  return container.cssRules[index];
};
var getValidRuleInsertionIndex = function getValidRuleInsertionIndex2(container, index) {
  var maxIndex = container.cssRules.length;
  if (index === void 0 || index > maxIndex) {
    return maxIndex;
  }
  return index;
};
var createStyle = function createStyle2() {
  var el2 = document.createElement("style");
  el2.textContent = "\n";
  return el2;
};
var DomRenderer = /* @__PURE__ */ function() {
  function DomRenderer2(sheet) {
    this.getPropertyValue = getPropertyValue;
    this.setProperty = setProperty;
    this.removeProperty = removeProperty;
    this.setSelector = setSelector;
    this.element = void 0;
    this.sheet = void 0;
    this.hasInsertedRules = false;
    this.cssRules = [];
    if (sheet)
      registry.add(sheet);
    this.sheet = sheet;
    var _ref = this.sheet ? this.sheet.options : {}, media = _ref.media, meta = _ref.meta, element = _ref.element;
    this.element = element || createStyle();
    this.element.setAttribute("data-jss", "");
    if (media)
      this.element.setAttribute("media", media);
    if (meta)
      this.element.setAttribute("data-meta", meta);
    var nonce = getNonce();
    if (nonce)
      this.element.setAttribute("nonce", nonce);
  }
  var _proto = DomRenderer2.prototype;
  _proto.attach = function attach2() {
    if (this.element.parentNode || !this.sheet)
      return;
    insertStyle(this.element, this.sheet.options);
    var deployed = Boolean(this.sheet && this.sheet.deployed);
    if (this.hasInsertedRules && deployed) {
      this.hasInsertedRules = false;
      this.deploy();
    }
  };
  _proto.detach = function detach2() {
    if (!this.sheet)
      return;
    var parentNode = this.element.parentNode;
    if (parentNode)
      parentNode.removeChild(this.element);
    if (this.sheet.options.link) {
      this.cssRules = [];
      this.element.textContent = "\n";
    }
  };
  _proto.deploy = function deploy() {
    var sheet = this.sheet;
    if (!sheet)
      return;
    if (sheet.options.link) {
      this.insertRules(sheet.rules);
      return;
    }
    this.element.textContent = "\n" + sheet.toString() + "\n";
  };
  _proto.insertRules = function insertRules(rules, nativeParent) {
    for (var i = 0; i < rules.index.length; i++) {
      this.insertRule(rules.index[i], i, nativeParent);
    }
  };
  _proto.insertRule = function insertRule2(rule, index, nativeParent) {
    if (nativeParent === void 0) {
      nativeParent = this.element.sheet;
    }
    if (rule.rules) {
      var parent = rule;
      var latestNativeParent = nativeParent;
      if (rule.type === "conditional" || rule.type === "keyframes") {
        var _insertionIndex = getValidRuleInsertionIndex(nativeParent, index);
        latestNativeParent = _insertRule(nativeParent, parent.toString({
          children: false
        }), _insertionIndex);
        if (latestNativeParent === false) {
          return false;
        }
        this.refCssRule(rule, _insertionIndex, latestNativeParent);
      }
      this.insertRules(parent.rules, latestNativeParent);
      return latestNativeParent;
    }
    var ruleStr = rule.toString();
    if (!ruleStr)
      return false;
    var insertionIndex = getValidRuleInsertionIndex(nativeParent, index);
    var nativeRule = _insertRule(nativeParent, ruleStr, insertionIndex);
    if (nativeRule === false) {
      return false;
    }
    this.hasInsertedRules = true;
    this.refCssRule(rule, insertionIndex, nativeRule);
    return nativeRule;
  };
  _proto.refCssRule = function refCssRule(rule, index, cssRule) {
    rule.renderable = cssRule;
    if (rule.options.parent instanceof StyleSheet) {
      this.cssRules[index] = cssRule;
    }
  };
  _proto.deleteRule = function deleteRule(cssRule) {
    var sheet = this.element.sheet;
    var index = this.indexOf(cssRule);
    if (index === -1)
      return false;
    sheet.deleteRule(index);
    this.cssRules.splice(index, 1);
    return true;
  };
  _proto.indexOf = function indexOf(cssRule) {
    return this.cssRules.indexOf(cssRule);
  };
  _proto.replaceRule = function replaceRule(cssRule, rule) {
    var index = this.indexOf(cssRule);
    if (index === -1)
      return false;
    this.element.sheet.deleteRule(index);
    this.cssRules.splice(index, 1);
    return this.insertRule(rule, index);
  };
  _proto.getRules = function getRules() {
    return this.element.sheet.cssRules;
  };
  return DomRenderer2;
}();
var instanceCounter = 0;
var Jss = /* @__PURE__ */ function() {
  function Jss2(options) {
    this.id = instanceCounter++;
    this.version = "10.5.0";
    this.plugins = new PluginsRegistry();
    this.options = {
      id: {
        minify: false
      },
      createGenerateId,
      Renderer: module_default ? DomRenderer : null,
      plugins: []
    };
    this.generateId = createGenerateId({
      minify: false
    });
    for (var i = 0; i < plugins.length; i++) {
      this.plugins.use(plugins[i], {
        queue: "internal"
      });
    }
    this.setup(options);
  }
  var _proto = Jss2.prototype;
  _proto.setup = function setup(options) {
    if (options === void 0) {
      options = {};
    }
    if (options.createGenerateId) {
      this.options.createGenerateId = options.createGenerateId;
    }
    if (options.id) {
      this.options.id = _extends({}, this.options.id, options.id);
    }
    if (options.createGenerateId || options.id) {
      this.generateId = this.options.createGenerateId(this.options.id);
    }
    if (options.insertionPoint != null)
      this.options.insertionPoint = options.insertionPoint;
    if ("Renderer" in options) {
      this.options.Renderer = options.Renderer;
    }
    if (options.plugins)
      this.use.apply(this, options.plugins);
    return this;
  };
  _proto.createStyleSheet = function createStyleSheet(styles, options) {
    if (options === void 0) {
      options = {};
    }
    var _options = options, index = _options.index;
    if (typeof index !== "number") {
      index = registry.index === 0 ? 0 : registry.index + 1;
    }
    var sheet = new StyleSheet(styles, _extends({}, options, {
      jss: this,
      generateId: options.generateId || this.generateId,
      insertionPoint: this.options.insertionPoint,
      Renderer: this.options.Renderer,
      index
    }));
    this.plugins.onProcessSheet(sheet);
    return sheet;
  };
  _proto.removeStyleSheet = function removeStyleSheet(sheet) {
    sheet.detach();
    registry.remove(sheet);
    return this;
  };
  _proto.createRule = function createRule$1(name, style, options) {
    if (style === void 0) {
      style = {};
    }
    if (options === void 0) {
      options = {};
    }
    if (typeof name === "object") {
      return this.createRule(void 0, name, style);
    }
    var ruleOptions = _extends({}, options, {
      name,
      jss: this,
      Renderer: this.options.Renderer
    });
    if (!ruleOptions.generateId)
      ruleOptions.generateId = this.generateId;
    if (!ruleOptions.classes)
      ruleOptions.classes = {};
    if (!ruleOptions.keyframes)
      ruleOptions.keyframes = {};
    var rule = createRule(name, style, ruleOptions);
    if (rule)
      this.plugins.onProcessRule(rule);
    return rule;
  };
  _proto.use = function use() {
    var _this = this;
    for (var _len = arguments.length, plugins3 = new Array(_len), _key = 0; _key < _len; _key++) {
      plugins3[_key] = arguments[_key];
    }
    plugins3.forEach(function(plugin2) {
      _this.plugins.use(plugin2);
    });
    return this;
  };
  return Jss2;
}();
function getDynamicStyles(styles) {
  var to = null;
  for (var key in styles) {
    var value = styles[key];
    var type = typeof value;
    if (type === "function") {
      if (!to)
        to = {};
      to[key] = value;
    } else if (type === "object" && value !== null && !Array.isArray(value)) {
      var extracted = getDynamicStyles(value);
      if (extracted) {
        if (!to)
          to = {};
        to[key] = extracted;
      }
    }
  }
  return to;
}
/**
 * A better abstraction over CSS.
 *
 * @copyright Oleg Isonen (Slobodskoi) / Isonen 2014-present
 * @website https://github.com/cssinjs/jss
 * @license MIT
 */
var hasCSSTOMSupport = typeof CSS === "object" && CSS != null && "number" in CSS;
var create = function create2(options) {
  return new Jss(options);
};
var jss = create();

// node_modules/@material-ui/core/esm/styles/colorManipulator.js
function clamp(value) {
  var min = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  var max = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
  if (false) {
    if (value < min || value > max) {
      console.error("Material-UI: The value provided ".concat(value, " is out of range [").concat(min, ", ").concat(max, "]."));
    }
  }
  return Math.min(Math.max(min, value), max);
}
function hexToRgb(color) {
  color = color.substr(1);
  var re = new RegExp(".{1,".concat(color.length >= 6 ? 2 : 1, "}"), "g");
  var colors = color.match(re);
  if (colors && colors[0].length === 1) {
    colors = colors.map(function(n) {
      return n + n;
    });
  }
  return colors ? "rgb".concat(colors.length === 4 ? "a" : "", "(").concat(colors.map(function(n, index) {
    return index < 3 ? parseInt(n, 16) : Math.round(parseInt(n, 16) / 255 * 1e3) / 1e3;
  }).join(", "), ")") : "";
}
function hslToRgb(color) {
  color = decomposeColor(color);
  var _color = color, values2 = _color.values;
  var h = values2[0];
  var s = values2[1] / 100;
  var l = values2[2] / 100;
  var a = s * Math.min(l, 1 - l);
  var f = function f2(n) {
    var k = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  var type = "rgb";
  var rgb = [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  if (color.type === "hsla") {
    type += "a";
    rgb.push(values2[3]);
  }
  return recomposeColor({
    type,
    values: rgb
  });
}
function decomposeColor(color) {
  if (color.type) {
    return color;
  }
  if (color.charAt(0) === "#") {
    return decomposeColor(hexToRgb(color));
  }
  var marker = color.indexOf("(");
  var type = color.substring(0, marker);
  if (["rgb", "rgba", "hsl", "hsla"].indexOf(type) === -1) {
    throw new Error(false ? "Material-UI: Unsupported `".concat(color, "` color.\nWe support the following formats: #nnn, #nnnnnn, rgb(), rgba(), hsl(), hsla().") : formatMuiErrorMessage(3, color));
  }
  var values2 = color.substring(marker + 1, color.length - 1).split(",");
  values2 = values2.map(function(value) {
    return parseFloat(value);
  });
  return {
    type,
    values: values2
  };
}
function recomposeColor(color) {
  var type = color.type;
  var values2 = color.values;
  if (type.indexOf("rgb") !== -1) {
    values2 = values2.map(function(n, i) {
      return i < 3 ? parseInt(n, 10) : n;
    });
  } else if (type.indexOf("hsl") !== -1) {
    values2[1] = "".concat(values2[1], "%");
    values2[2] = "".concat(values2[2], "%");
  }
  return "".concat(type, "(").concat(values2.join(", "), ")");
}
function getContrastRatio(foreground, background) {
  var lumA = getLuminance(foreground);
  var lumB = getLuminance(background);
  return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05);
}
function getLuminance(color) {
  color = decomposeColor(color);
  var rgb = color.type === "hsl" ? decomposeColor(hslToRgb(color)).values : color.values;
  rgb = rgb.map(function(val) {
    val /= 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return Number((0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]).toFixed(3));
}
function darken(color, coefficient) {
  color = decomposeColor(color);
  coefficient = clamp(coefficient);
  if (color.type.indexOf("hsl") !== -1) {
    color.values[2] *= 1 - coefficient;
  } else if (color.type.indexOf("rgb") !== -1) {
    for (var i = 0; i < 3; i += 1) {
      color.values[i] *= 1 - coefficient;
    }
  }
  return recomposeColor(color);
}
function lighten(color, coefficient) {
  color = decomposeColor(color);
  coefficient = clamp(coefficient);
  if (color.type.indexOf("hsl") !== -1) {
    color.values[2] += (100 - color.values[2]) * coefficient;
  } else if (color.type.indexOf("rgb") !== -1) {
    for (var i = 0; i < 3; i += 1) {
      color.values[i] += (255 - color.values[i]) * coefficient;
    }
  }
  return recomposeColor(color);
}

// node_modules/@material-ui/core/esm/styles/createBreakpoints.js
var keys = ["xs", "sm", "md", "lg", "xl"];
function createBreakpoints(breakpoints) {
  var _breakpoints$values = breakpoints.values, values2 = _breakpoints$values === void 0 ? {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920
  } : _breakpoints$values, _breakpoints$unit = breakpoints.unit, unit = _breakpoints$unit === void 0 ? "px" : _breakpoints$unit, _breakpoints$step = breakpoints.step, step = _breakpoints$step === void 0 ? 5 : _breakpoints$step, other = _objectWithoutProperties(breakpoints, ["values", "unit", "step"]);
  function up2(key) {
    var value = typeof values2[key] === "number" ? values2[key] : key;
    return "@media (min-width:".concat(value).concat(unit, ")");
  }
  function down(key) {
    var endIndex = keys.indexOf(key) + 1;
    var upperbound = values2[keys[endIndex]];
    if (endIndex === keys.length) {
      return up2("xs");
    }
    var value = typeof upperbound === "number" && endIndex > 0 ? upperbound : key;
    return "@media (max-width:".concat(value - step / 100).concat(unit, ")");
  }
  function between(start, end) {
    var endIndex = keys.indexOf(end);
    if (endIndex === keys.length - 1) {
      return up2(start);
    }
    return "@media (min-width:".concat(typeof values2[start] === "number" ? values2[start] : start).concat(unit, ") and ") + "(max-width:".concat((endIndex !== -1 && typeof values2[keys[endIndex + 1]] === "number" ? values2[keys[endIndex + 1]] : end) - step / 100).concat(unit, ")");
  }
  function only(key) {
    return between(key, key);
  }
  function width(key) {
    return values2[key];
  }
  return _extends({
    keys,
    values: values2,
    up: up2,
    down,
    between,
    only,
    width
  }, other);
}

// node_modules/@material-ui/core/esm/styles/createMixins.js
function createMixins(breakpoints, spacing2, mixins) {
  var _toolbar;
  return _extends({
    gutters: function gutters() {
      var styles = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      return _extends({
        paddingLeft: spacing2(2),
        paddingRight: spacing2(2)
      }, styles, _defineProperty({}, breakpoints.up("sm"), _extends({
        paddingLeft: spacing2(3),
        paddingRight: spacing2(3)
      }, styles[breakpoints.up("sm")])));
    },
    toolbar: (_toolbar = {
      minHeight: 56
    }, _defineProperty(_toolbar, "".concat(breakpoints.up("xs"), " and (orientation: landscape)"), {
      minHeight: 48
    }), _defineProperty(_toolbar, breakpoints.up("sm"), {
      minHeight: 64
    }), _toolbar)
  }, mixins);
}

// node_modules/@material-ui/core/esm/colors/common.js
var common = {
  black: "#000",
  white: "#fff"
};
var common_default = common;

// node_modules/@material-ui/core/esm/colors/grey.js
var grey = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#eeeeee",
  300: "#e0e0e0",
  400: "#bdbdbd",
  500: "#9e9e9e",
  600: "#757575",
  700: "#616161",
  800: "#424242",
  900: "#212121",
  A100: "#d5d5d5",
  A200: "#aaaaaa",
  A400: "#303030",
  A700: "#616161"
};
var grey_default = grey;

// node_modules/@material-ui/core/esm/colors/indigo.js
var indigo = {
  50: "#e8eaf6",
  100: "#c5cae9",
  200: "#9fa8da",
  300: "#7986cb",
  400: "#5c6bc0",
  500: "#3f51b5",
  600: "#3949ab",
  700: "#303f9f",
  800: "#283593",
  900: "#1a237e",
  A100: "#8c9eff",
  A200: "#536dfe",
  A400: "#3d5afe",
  A700: "#304ffe"
};
var indigo_default = indigo;

// node_modules/@material-ui/core/esm/colors/pink.js
var pink = {
  50: "#fce4ec",
  100: "#f8bbd0",
  200: "#f48fb1",
  300: "#f06292",
  400: "#ec407a",
  500: "#e91e63",
  600: "#d81b60",
  700: "#c2185b",
  800: "#ad1457",
  900: "#880e4f",
  A100: "#ff80ab",
  A200: "#ff4081",
  A400: "#f50057",
  A700: "#c51162"
};
var pink_default = pink;

// node_modules/@material-ui/core/esm/colors/red.js
var red = {
  50: "#ffebee",
  100: "#ffcdd2",
  200: "#ef9a9a",
  300: "#e57373",
  400: "#ef5350",
  500: "#f44336",
  600: "#e53935",
  700: "#d32f2f",
  800: "#c62828",
  900: "#b71c1c",
  A100: "#ff8a80",
  A200: "#ff5252",
  A400: "#ff1744",
  A700: "#d50000"
};
var red_default = red;

// node_modules/@material-ui/core/esm/colors/orange.js
var orange = {
  50: "#fff3e0",
  100: "#ffe0b2",
  200: "#ffcc80",
  300: "#ffb74d",
  400: "#ffa726",
  500: "#ff9800",
  600: "#fb8c00",
  700: "#f57c00",
  800: "#ef6c00",
  900: "#e65100",
  A100: "#ffd180",
  A200: "#ffab40",
  A400: "#ff9100",
  A700: "#ff6d00"
};
var orange_default = orange;

// node_modules/@material-ui/core/esm/colors/blue.js
var blue = {
  50: "#e3f2fd",
  100: "#bbdefb",
  200: "#90caf9",
  300: "#64b5f6",
  400: "#42a5f5",
  500: "#2196f3",
  600: "#1e88e5",
  700: "#1976d2",
  800: "#1565c0",
  900: "#0d47a1",
  A100: "#82b1ff",
  A200: "#448aff",
  A400: "#2979ff",
  A700: "#2962ff"
};
var blue_default = blue;

// node_modules/@material-ui/core/esm/colors/green.js
var green = {
  50: "#e8f5e9",
  100: "#c8e6c9",
  200: "#a5d6a7",
  300: "#81c784",
  400: "#66bb6a",
  500: "#4caf50",
  600: "#43a047",
  700: "#388e3c",
  800: "#2e7d32",
  900: "#1b5e20",
  A100: "#b9f6ca",
  A200: "#69f0ae",
  A400: "#00e676",
  A700: "#00c853"
};
var green_default = green;

// node_modules/@material-ui/core/esm/styles/createPalette.js
var light = {
  text: {
    primary: "rgba(0, 0, 0, 0.87)",
    secondary: "rgba(0, 0, 0, 0.54)",
    disabled: "rgba(0, 0, 0, 0.38)",
    hint: "rgba(0, 0, 0, 0.38)"
  },
  divider: "rgba(0, 0, 0, 0.12)",
  background: {
    paper: common_default.white,
    default: grey_default[50]
  },
  action: {
    active: "rgba(0, 0, 0, 0.54)",
    hover: "rgba(0, 0, 0, 0.04)",
    hoverOpacity: 0.04,
    selected: "rgba(0, 0, 0, 0.08)",
    selectedOpacity: 0.08,
    disabled: "rgba(0, 0, 0, 0.26)",
    disabledBackground: "rgba(0, 0, 0, 0.12)",
    disabledOpacity: 0.38,
    focus: "rgba(0, 0, 0, 0.12)",
    focusOpacity: 0.12,
    activatedOpacity: 0.12
  }
};
var dark = {
  text: {
    primary: common_default.white,
    secondary: "rgba(255, 255, 255, 0.7)",
    disabled: "rgba(255, 255, 255, 0.5)",
    hint: "rgba(255, 255, 255, 0.5)",
    icon: "rgba(255, 255, 255, 0.5)"
  },
  divider: "rgba(255, 255, 255, 0.12)",
  background: {
    paper: grey_default[800],
    default: "#303030"
  },
  action: {
    active: common_default.white,
    hover: "rgba(255, 255, 255, 0.08)",
    hoverOpacity: 0.08,
    selected: "rgba(255, 255, 255, 0.16)",
    selectedOpacity: 0.16,
    disabled: "rgba(255, 255, 255, 0.3)",
    disabledBackground: "rgba(255, 255, 255, 0.12)",
    disabledOpacity: 0.38,
    focus: "rgba(255, 255, 255, 0.12)",
    focusOpacity: 0.12,
    activatedOpacity: 0.24
  }
};
function addLightOrDark(intent, direction, shade, tonalOffset) {
  var tonalOffsetLight = tonalOffset.light || tonalOffset;
  var tonalOffsetDark = tonalOffset.dark || tonalOffset * 1.5;
  if (!intent[direction]) {
    if (intent.hasOwnProperty(shade)) {
      intent[direction] = intent[shade];
    } else if (direction === "light") {
      intent.light = lighten(intent.main, tonalOffsetLight);
    } else if (direction === "dark") {
      intent.dark = darken(intent.main, tonalOffsetDark);
    }
  }
}
function createPalette(palette) {
  var _palette$primary = palette.primary, primary = _palette$primary === void 0 ? {
    light: indigo_default[300],
    main: indigo_default[500],
    dark: indigo_default[700]
  } : _palette$primary, _palette$secondary = palette.secondary, secondary = _palette$secondary === void 0 ? {
    light: pink_default.A200,
    main: pink_default.A400,
    dark: pink_default.A700
  } : _palette$secondary, _palette$error = palette.error, error = _palette$error === void 0 ? {
    light: red_default[300],
    main: red_default[500],
    dark: red_default[700]
  } : _palette$error, _palette$warning = palette.warning, warning = _palette$warning === void 0 ? {
    light: orange_default[300],
    main: orange_default[500],
    dark: orange_default[700]
  } : _palette$warning, _palette$info = palette.info, info = _palette$info === void 0 ? {
    light: blue_default[300],
    main: blue_default[500],
    dark: blue_default[700]
  } : _palette$info, _palette$success = palette.success, success = _palette$success === void 0 ? {
    light: green_default[300],
    main: green_default[500],
    dark: green_default[700]
  } : _palette$success, _palette$type = palette.type, type = _palette$type === void 0 ? "light" : _palette$type, _palette$contrastThre = palette.contrastThreshold, contrastThreshold = _palette$contrastThre === void 0 ? 3 : _palette$contrastThre, _palette$tonalOffset = palette.tonalOffset, tonalOffset = _palette$tonalOffset === void 0 ? 0.2 : _palette$tonalOffset, other = _objectWithoutProperties(palette, ["primary", "secondary", "error", "warning", "info", "success", "type", "contrastThreshold", "tonalOffset"]);
  function getContrastText(background) {
    var contrastText = getContrastRatio(background, dark.text.primary) >= contrastThreshold ? dark.text.primary : light.text.primary;
    if (false) {
      var contrast = getContrastRatio(background, contrastText);
      if (contrast < 3) {
        console.error(["Material-UI: The contrast ratio of ".concat(contrast, ":1 for ").concat(contrastText, " on ").concat(background), "falls below the WCAG recommended absolute minimum contrast ratio of 3:1.", "https://www.w3.org/TR/2008/REC-WCAG20-20081211/#visual-audio-contrast-contrast"].join("\n"));
      }
    }
    return contrastText;
  }
  var augmentColor = function augmentColor2(color) {
    var mainShade = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 500;
    var lightShade = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 300;
    var darkShade = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 700;
    color = _extends({}, color);
    if (!color.main && color[mainShade]) {
      color.main = color[mainShade];
    }
    if (!color.main) {
      throw new Error(false ? "Material-UI: The color provided to augmentColor(color) is invalid.\nThe color object needs to have a `main` property or a `".concat(mainShade, "` property.") : formatMuiErrorMessage(4, mainShade));
    }
    if (typeof color.main !== "string") {
      throw new Error(false ? "Material-UI: The color provided to augmentColor(color) is invalid.\n`color.main` should be a string, but `".concat(JSON.stringify(color.main), '` was provided instead.\n\nDid you intend to use one of the following approaches?\n\nimport {\xA0green } from "@material-ui/core/colors";\n\nconst theme1 = createMuiTheme({ palette: {\n  primary: green,\n} });\n\nconst theme2 = createMuiTheme({ palette: {\n  primary: { main: green[500] },\n} });') : formatMuiErrorMessage(5, JSON.stringify(color.main)));
    }
    addLightOrDark(color, "light", lightShade, tonalOffset);
    addLightOrDark(color, "dark", darkShade, tonalOffset);
    if (!color.contrastText) {
      color.contrastText = getContrastText(color.main);
    }
    return color;
  };
  var types = {
    dark,
    light
  };
  if (false) {
    if (!types[type]) {
      console.error("Material-UI: The palette type `".concat(type, "` is not supported."));
    }
  }
  var paletteOutput = deepmerge(_extends({
    common: common_default,
    type,
    primary: augmentColor(primary),
    secondary: augmentColor(secondary, "A400", "A200", "A700"),
    error: augmentColor(error),
    warning: augmentColor(warning),
    info: augmentColor(info),
    success: augmentColor(success),
    grey: grey_default,
    contrastThreshold,
    getContrastText,
    augmentColor,
    tonalOffset
  }, types[type]), other);
  return paletteOutput;
}

// node_modules/@material-ui/core/esm/styles/createTypography.js
function round(value) {
  return Math.round(value * 1e5) / 1e5;
}
var caseAllCaps = {
  textTransform: "uppercase"
};
var defaultFontFamily = '"Roboto", "Helvetica", "Arial", sans-serif';
function createTypography(palette, typography) {
  var _ref = typeof typography === "function" ? typography(palette) : typography, _ref$fontFamily = _ref.fontFamily, fontFamily = _ref$fontFamily === void 0 ? defaultFontFamily : _ref$fontFamily, _ref$fontSize = _ref.fontSize, fontSize = _ref$fontSize === void 0 ? 14 : _ref$fontSize, _ref$fontWeightLight = _ref.fontWeightLight, fontWeightLight = _ref$fontWeightLight === void 0 ? 300 : _ref$fontWeightLight, _ref$fontWeightRegula = _ref.fontWeightRegular, fontWeightRegular = _ref$fontWeightRegula === void 0 ? 400 : _ref$fontWeightRegula, _ref$fontWeightMedium = _ref.fontWeightMedium, fontWeightMedium = _ref$fontWeightMedium === void 0 ? 500 : _ref$fontWeightMedium, _ref$fontWeightBold = _ref.fontWeightBold, fontWeightBold = _ref$fontWeightBold === void 0 ? 700 : _ref$fontWeightBold, _ref$htmlFontSize = _ref.htmlFontSize, htmlFontSize = _ref$htmlFontSize === void 0 ? 16 : _ref$htmlFontSize, allVariants = _ref.allVariants, pxToRem2 = _ref.pxToRem, other = _objectWithoutProperties(_ref, ["fontFamily", "fontSize", "fontWeightLight", "fontWeightRegular", "fontWeightMedium", "fontWeightBold", "htmlFontSize", "allVariants", "pxToRem"]);
  if (false) {
    if (typeof fontSize !== "number") {
      console.error("Material-UI: `fontSize` is required to be a number.");
    }
    if (typeof htmlFontSize !== "number") {
      console.error("Material-UI: `htmlFontSize` is required to be a number.");
    }
  }
  var coef = fontSize / 14;
  var pxToRem = pxToRem2 || function(size) {
    return "".concat(size / htmlFontSize * coef, "rem");
  };
  var buildVariant = function buildVariant2(fontWeight, size, lineHeight, letterSpacing, casing) {
    return _extends({
      fontFamily,
      fontWeight,
      fontSize: pxToRem(size),
      lineHeight
    }, fontFamily === defaultFontFamily ? {
      letterSpacing: "".concat(round(letterSpacing / size), "em")
    } : {}, casing, allVariants);
  };
  var variants = {
    h1: buildVariant(fontWeightLight, 96, 1.167, -1.5),
    h2: buildVariant(fontWeightLight, 60, 1.2, -0.5),
    h3: buildVariant(fontWeightRegular, 48, 1.167, 0),
    h4: buildVariant(fontWeightRegular, 34, 1.235, 0.25),
    h5: buildVariant(fontWeightRegular, 24, 1.334, 0),
    h6: buildVariant(fontWeightMedium, 20, 1.6, 0.15),
    subtitle1: buildVariant(fontWeightRegular, 16, 1.75, 0.15),
    subtitle2: buildVariant(fontWeightMedium, 14, 1.57, 0.1),
    body1: buildVariant(fontWeightRegular, 16, 1.5, 0.15),
    body2: buildVariant(fontWeightRegular, 14, 1.43, 0.15),
    button: buildVariant(fontWeightMedium, 14, 1.75, 0.4, caseAllCaps),
    caption: buildVariant(fontWeightRegular, 12, 1.66, 0.4),
    overline: buildVariant(fontWeightRegular, 12, 2.66, 1, caseAllCaps)
  };
  return deepmerge(_extends({
    htmlFontSize,
    pxToRem,
    round,
    fontFamily,
    fontSize,
    fontWeightLight,
    fontWeightRegular,
    fontWeightMedium,
    fontWeightBold
  }, variants), other, {
    clone: false
  });
}

// node_modules/@material-ui/core/esm/styles/shadows.js
var shadowKeyUmbraOpacity = 0.2;
var shadowKeyPenumbraOpacity = 0.14;
var shadowAmbientShadowOpacity = 0.12;
function createShadow() {
  return ["".concat(arguments.length <= 0 ? void 0 : arguments[0], "px ").concat(arguments.length <= 1 ? void 0 : arguments[1], "px ").concat(arguments.length <= 2 ? void 0 : arguments[2], "px ").concat(arguments.length <= 3 ? void 0 : arguments[3], "px rgba(0,0,0,").concat(shadowKeyUmbraOpacity, ")"), "".concat(arguments.length <= 4 ? void 0 : arguments[4], "px ").concat(arguments.length <= 5 ? void 0 : arguments[5], "px ").concat(arguments.length <= 6 ? void 0 : arguments[6], "px ").concat(arguments.length <= 7 ? void 0 : arguments[7], "px rgba(0,0,0,").concat(shadowKeyPenumbraOpacity, ")"), "".concat(arguments.length <= 8 ? void 0 : arguments[8], "px ").concat(arguments.length <= 9 ? void 0 : arguments[9], "px ").concat(arguments.length <= 10 ? void 0 : arguments[10], "px ").concat(arguments.length <= 11 ? void 0 : arguments[11], "px rgba(0,0,0,").concat(shadowAmbientShadowOpacity, ")")].join(",");
}
var shadows = ["none", createShadow(0, 2, 1, -1, 0, 1, 1, 0, 0, 1, 3, 0), createShadow(0, 3, 1, -2, 0, 2, 2, 0, 0, 1, 5, 0), createShadow(0, 3, 3, -2, 0, 3, 4, 0, 0, 1, 8, 0), createShadow(0, 2, 4, -1, 0, 4, 5, 0, 0, 1, 10, 0), createShadow(0, 3, 5, -1, 0, 5, 8, 0, 0, 1, 14, 0), createShadow(0, 3, 5, -1, 0, 6, 10, 0, 0, 1, 18, 0), createShadow(0, 4, 5, -2, 0, 7, 10, 1, 0, 2, 16, 1), createShadow(0, 5, 5, -3, 0, 8, 10, 1, 0, 3, 14, 2), createShadow(0, 5, 6, -3, 0, 9, 12, 1, 0, 3, 16, 2), createShadow(0, 6, 6, -3, 0, 10, 14, 1, 0, 4, 18, 3), createShadow(0, 6, 7, -4, 0, 11, 15, 1, 0, 4, 20, 3), createShadow(0, 7, 8, -4, 0, 12, 17, 2, 0, 5, 22, 4), createShadow(0, 7, 8, -4, 0, 13, 19, 2, 0, 5, 24, 4), createShadow(0, 7, 9, -4, 0, 14, 21, 2, 0, 5, 26, 4), createShadow(0, 8, 9, -5, 0, 15, 22, 2, 0, 6, 28, 5), createShadow(0, 8, 10, -5, 0, 16, 24, 2, 0, 6, 30, 5), createShadow(0, 8, 11, -5, 0, 17, 26, 2, 0, 6, 32, 5), createShadow(0, 9, 11, -5, 0, 18, 28, 2, 0, 7, 34, 6), createShadow(0, 9, 12, -6, 0, 19, 29, 2, 0, 7, 36, 6), createShadow(0, 10, 13, -6, 0, 20, 31, 3, 0, 8, 38, 7), createShadow(0, 10, 13, -6, 0, 21, 33, 3, 0, 8, 40, 7), createShadow(0, 10, 14, -6, 0, 22, 35, 3, 0, 8, 42, 7), createShadow(0, 11, 14, -7, 0, 23, 36, 3, 0, 9, 44, 8), createShadow(0, 11, 15, -7, 0, 24, 38, 3, 0, 9, 46, 8)];
var shadows_default = shadows;

// node_modules/@material-ui/core/esm/styles/shape.js
var shape = {
  borderRadius: 4
};
var shape_default = shape;

// node_modules/@material-ui/system/esm/breakpoints.js
var import_prop_types = __toModule(require_prop_types());

// node_modules/@material-ui/system/esm/merge.js
function merge(acc, item) {
  if (!item) {
    return acc;
  }
  return deepmerge(acc, item, {
    clone: false
  });
}
var merge_default = merge;

// node_modules/@material-ui/system/esm/breakpoints.js
var values = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920
};
var defaultBreakpoints = {
  keys: ["xs", "sm", "md", "lg", "xl"],
  up: function up(key) {
    return "@media (min-width:".concat(values[key], "px)");
  }
};
function handleBreakpoints(props, propValue, styleFromPropValue) {
  if (false) {
    if (!props.theme) {
      console.error("Material-UI: You are calling a style function without a theme value.");
    }
  }
  if (Array.isArray(propValue)) {
    var themeBreakpoints = props.theme.breakpoints || defaultBreakpoints;
    return propValue.reduce(function(acc, item, index) {
      acc[themeBreakpoints.up(themeBreakpoints.keys[index])] = styleFromPropValue(propValue[index]);
      return acc;
    }, {});
  }
  if (_typeof(propValue) === "object") {
    var _themeBreakpoints = props.theme.breakpoints || defaultBreakpoints;
    return Object.keys(propValue).reduce(function(acc, breakpoint) {
      acc[_themeBreakpoints.up(breakpoint)] = styleFromPropValue(propValue[breakpoint]);
      return acc;
    }, {});
  }
  var output = styleFromPropValue(propValue);
  return output;
}

// ../../node_modules/@babel/runtime/helpers/esm/arrayWithHoles.js
function _arrayWithHoles(arr) {
  if (Array.isArray(arr))
    return arr;
}

// ../../node_modules/@babel/runtime/helpers/esm/iterableToArrayLimit.js
function _iterableToArrayLimit(arr, i) {
  if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr)))
    return;
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = void 0;
  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);
      if (i && _arr.length === i)
        break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null)
        _i["return"]();
    } finally {
      if (_d)
        throw _e;
    }
  }
  return _arr;
}

// ../../node_modules/@babel/runtime/helpers/esm/nonIterableRest.js
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

// ../../node_modules/@babel/runtime/helpers/esm/slicedToArray.js
function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
}

// node_modules/@material-ui/system/esm/memoize.js
function memoize3(fn) {
  var cache2 = {};
  return function(arg) {
    if (cache2[arg] === void 0) {
      cache2[arg] = fn(arg);
    }
    return cache2[arg];
  };
}

// node_modules/@material-ui/system/esm/spacing.js
var properties = {
  m: "margin",
  p: "padding"
};
var directions = {
  t: "Top",
  r: "Right",
  b: "Bottom",
  l: "Left",
  x: ["Left", "Right"],
  y: ["Top", "Bottom"]
};
var aliases = {
  marginX: "mx",
  marginY: "my",
  paddingX: "px",
  paddingY: "py"
};
var getCssProperties = memoize3(function(prop) {
  if (prop.length > 2) {
    if (aliases[prop]) {
      prop = aliases[prop];
    } else {
      return [prop];
    }
  }
  var _prop$split = prop.split(""), _prop$split2 = _slicedToArray(_prop$split, 2), a = _prop$split2[0], b = _prop$split2[1];
  var property = properties[a];
  var direction = directions[b] || "";
  return Array.isArray(direction) ? direction.map(function(dir) {
    return property + dir;
  }) : [property + direction];
});
var spacingKeys = ["m", "mt", "mr", "mb", "ml", "mx", "my", "p", "pt", "pr", "pb", "pl", "px", "py", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", "marginX", "marginY", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "paddingX", "paddingY"];
function createUnarySpacing(theme) {
  var themeSpacing = theme.spacing || 8;
  if (typeof themeSpacing === "number") {
    return function(abs) {
      if (false) {
        if (typeof abs !== "number") {
          console.error("Material-UI: Expected spacing argument to be a number, got ".concat(abs, "."));
        }
      }
      return themeSpacing * abs;
    };
  }
  if (Array.isArray(themeSpacing)) {
    return function(abs) {
      if (false) {
        if (abs > themeSpacing.length - 1) {
          console.error(["Material-UI: The value provided (".concat(abs, ") overflows."), "The supported values are: ".concat(JSON.stringify(themeSpacing), "."), "".concat(abs, " > ").concat(themeSpacing.length - 1, ", you need to add the missing values.")].join("\n"));
        }
      }
      return themeSpacing[abs];
    };
  }
  if (typeof themeSpacing === "function") {
    return themeSpacing;
  }
  if (false) {
    console.error(["Material-UI: The `theme.spacing` value (".concat(themeSpacing, ") is invalid."), "It should be a number, an array or a function."].join("\n"));
  }
  return function() {
    return void 0;
  };
}
function getValue(transformer, propValue) {
  if (typeof propValue === "string") {
    return propValue;
  }
  var abs = Math.abs(propValue);
  var transformed = transformer(abs);
  if (propValue >= 0) {
    return transformed;
  }
  if (typeof transformed === "number") {
    return -transformed;
  }
  return "-".concat(transformed);
}
function getStyleFromPropValue(cssProperties, transformer) {
  return function(propValue) {
    return cssProperties.reduce(function(acc, cssProperty) {
      acc[cssProperty] = getValue(transformer, propValue);
      return acc;
    }, {});
  };
}
function spacing(props) {
  var theme = props.theme;
  var transformer = createUnarySpacing(theme);
  return Object.keys(props).map(function(prop) {
    if (spacingKeys.indexOf(prop) === -1) {
      return null;
    }
    var cssProperties = getCssProperties(prop);
    var styleFromPropValue = getStyleFromPropValue(cssProperties, transformer);
    var propValue = props[prop];
    return handleBreakpoints(props, propValue, styleFromPropValue);
  }).reduce(merge_default, {});
}
spacing.propTypes = false ? spacingKeys.reduce(function(obj, key) {
  obj[key] = responsivePropType_default;
  return obj;
}, {}) : {};
spacing.filterProps = spacingKeys;

// node_modules/@material-ui/system/esm/index.js
/** @license Material-UI v4.11.2
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// node_modules/@material-ui/core/esm/styles/createSpacing.js
var warnOnce;
function createSpacing() {
  var spacingInput = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 8;
  if (spacingInput.mui) {
    return spacingInput;
  }
  var transform2 = createUnarySpacing({
    spacing: spacingInput
  });
  var spacing2 = function spacing3() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    if (false) {
      if (!(args.length <= 4)) {
        console.error("Material-UI: Too many arguments provided, expected between 0 and 4, got ".concat(args.length));
      }
    }
    if (args.length === 0) {
      return transform2(1);
    }
    if (args.length === 1) {
      return transform2(args[0]);
    }
    return args.map(function(argument) {
      if (typeof argument === "string") {
        return argument;
      }
      var output = transform2(argument);
      return typeof output === "number" ? "".concat(output, "px") : output;
    }).join(" ");
  };
  Object.defineProperty(spacing2, "unit", {
    get: function get2() {
      if (false) {
        if (!warnOnce || false) {
          console.error(["Material-UI: theme.spacing.unit usage has been deprecated.", "It will be removed in v5.", "You can replace `theme.spacing.unit * y` with `theme.spacing(y)`.", "", "You can use the `https://github.com/mui-org/material-ui/tree/master/packages/material-ui-codemod/README.md#theme-spacing-api` migration helper to make the process smoother."].join("\n"));
        }
        warnOnce = true;
      }
      return spacingInput;
    }
  });
  spacing2.mui = true;
  return spacing2;
}

// node_modules/@material-ui/core/esm/styles/transitions.js
var easing = {
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  sharp: "cubic-bezier(0.4, 0, 0.6, 1)"
};
var duration = {
  shortest: 150,
  shorter: 200,
  short: 250,
  standard: 300,
  complex: 375,
  enteringScreen: 225,
  leavingScreen: 195
};
function formatMs(milliseconds) {
  return "".concat(Math.round(milliseconds), "ms");
}
var transitions_default = {
  easing,
  duration,
  create: function create3() {
    var props = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : ["all"];
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var _options$duration = options.duration, durationOption = _options$duration === void 0 ? duration.standard : _options$duration, _options$easing = options.easing, easingOption = _options$easing === void 0 ? easing.easeInOut : _options$easing, _options$delay = options.delay, delay = _options$delay === void 0 ? 0 : _options$delay, other = _objectWithoutProperties(options, ["duration", "easing", "delay"]);
    if (false) {
      var isString = function isString2(value) {
        return typeof value === "string";
      };
      var isNumber = function isNumber2(value) {
        return !isNaN(parseFloat(value));
      };
      if (!isString(props) && !Array.isArray(props)) {
        console.error('Material-UI: Argument "props" must be a string or Array.');
      }
      if (!isNumber(durationOption) && !isString(durationOption)) {
        console.error('Material-UI: Argument "duration" must be a number or a string but found '.concat(durationOption, "."));
      }
      if (!isString(easingOption)) {
        console.error('Material-UI: Argument "easing" must be a string.');
      }
      if (!isNumber(delay) && !isString(delay)) {
        console.error('Material-UI: Argument "delay" must be a number or a string.');
      }
      if (Object.keys(other).length !== 0) {
        console.error("Material-UI: Unrecognized argument(s) [".concat(Object.keys(other).join(","), "]."));
      }
    }
    return (Array.isArray(props) ? props : [props]).map(function(animatedProp) {
      return "".concat(animatedProp, " ").concat(typeof durationOption === "string" ? durationOption : formatMs(durationOption), " ").concat(easingOption, " ").concat(typeof delay === "string" ? delay : formatMs(delay));
    }).join(",");
  },
  getAutoHeightDuration: function getAutoHeightDuration(height) {
    if (!height) {
      return 0;
    }
    var constant = height / 36;
    return Math.round((4 + 15 * Math.pow(constant, 0.25) + constant / 5) * 10);
  }
};

// node_modules/@material-ui/core/esm/styles/zIndex.js
var zIndex = {
  mobileStepper: 1e3,
  speedDial: 1050,
  appBar: 1100,
  drawer: 1200,
  modal: 1300,
  snackbar: 1400,
  tooltip: 1500
};
var zIndex_default = zIndex;

// node_modules/@material-ui/core/esm/styles/createMuiTheme.js
function createMuiTheme() {
  var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  var _options$breakpoints = options.breakpoints, breakpointsInput = _options$breakpoints === void 0 ? {} : _options$breakpoints, _options$mixins = options.mixins, mixinsInput = _options$mixins === void 0 ? {} : _options$mixins, _options$palette = options.palette, paletteInput = _options$palette === void 0 ? {} : _options$palette, spacingInput = options.spacing, _options$typography = options.typography, typographyInput = _options$typography === void 0 ? {} : _options$typography, other = _objectWithoutProperties(options, ["breakpoints", "mixins", "palette", "spacing", "typography"]);
  var palette = createPalette(paletteInput);
  var breakpoints = createBreakpoints(breakpointsInput);
  var spacing2 = createSpacing(spacingInput);
  var muiTheme = deepmerge({
    breakpoints,
    direction: "ltr",
    mixins: createMixins(breakpoints, spacing2, mixinsInput),
    overrides: {},
    palette,
    props: {},
    shadows: shadows_default,
    typography: createTypography(palette, typographyInput),
    spacing: spacing2,
    shape: shape_default,
    transitions: transitions_default,
    zIndex: zIndex_default
  }, other);
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }
  muiTheme = args.reduce(function(acc, argument) {
    return deepmerge(acc, argument);
  }, muiTheme);
  if (false) {
    var pseudoClasses2 = ["checked", "disabled", "error", "focused", "focusVisible", "required", "expanded", "selected"];
    var traverse = function traverse2(node, parentKey) {
      var depth = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
      var key;
      for (key in node) {
        var child = node[key];
        if (depth === 1) {
          if (key.indexOf("Mui") === 0 && child) {
            traverse2(child, key, depth + 1);
          }
        } else if (pseudoClasses2.indexOf(key) !== -1 && Object.keys(child).length > 0) {
          if (false) {
            console.error(["Material-UI: The `".concat(parentKey, "` component increases ") + "the CSS specificity of the `".concat(key, "` internal state."), "You can not override it like this: ", JSON.stringify(node, null, 2), "", "Instead, you need to use the $ruleName syntax:", JSON.stringify({
              root: _defineProperty({}, "&$".concat(key), child)
            }, null, 2), "", "https://material-ui.com/r/pseudo-classes-guide"].join("\n"));
          }
          node[key] = {};
        }
      }
    };
    traverse(muiTheme.overrides);
  }
  return muiTheme;
}
var createMuiTheme_default = createMuiTheme;

// node_modules/@material-ui/core/esm/styles/defaultTheme.js
var defaultTheme = createMuiTheme_default();
var defaultTheme_default = defaultTheme;

// node_modules/@material-ui/styles/esm/StylesProvider/StylesProvider.js
var import_prop_types2 = __toModule(require_prop_types());
import React from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/styles/esm/ThemeProvider/nested.js
var hasSymbol = typeof Symbol === "function" && Symbol.for;
var nested_default = hasSymbol ? Symbol.for("mui.nested") : "__THEME_NESTED__";

// node_modules/@material-ui/styles/esm/createGenerateClassName/createGenerateClassName.js
var pseudoClasses = ["checked", "disabled", "error", "focused", "focusVisible", "required", "expanded", "selected"];
function createGenerateClassName() {
  var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  var _options$disableGloba = options.disableGlobal, disableGlobal = _options$disableGloba === void 0 ? false : _options$disableGloba, _options$productionPr = options.productionPrefix, productionPrefix = _options$productionPr === void 0 ? "jss" : _options$productionPr, _options$seed = options.seed, seed = _options$seed === void 0 ? "" : _options$seed;
  var seedPrefix = seed === "" ? "" : "".concat(seed, "-");
  var ruleCounter = 0;
  var getNextCounterId = function getNextCounterId2() {
    ruleCounter += 1;
    if (false) {
      if (ruleCounter >= 1e10) {
        console.warn(["Material-UI: You might have a memory leak.", "The ruleCounter is not supposed to grow that much."].join(""));
      }
    }
    return ruleCounter;
  };
  return function(rule, styleSheet) {
    var name = styleSheet.options.name;
    if (name && name.indexOf("Mui") === 0 && !styleSheet.options.link && !disableGlobal) {
      if (pseudoClasses.indexOf(rule.key) !== -1) {
        return "Mui-".concat(rule.key);
      }
      var prefix2 = "".concat(seedPrefix).concat(name, "-").concat(rule.key);
      if (!styleSheet.options.theme[nested_default] || seed !== "") {
        return prefix2;
      }
      return "".concat(prefix2, "-").concat(getNextCounterId());
    }
    if (true) {
      return "".concat(seedPrefix).concat(productionPrefix).concat(getNextCounterId());
    }
    var suffix = "".concat(rule.key, "-").concat(getNextCounterId());
    if (styleSheet.options.classNamePrefix) {
      return "".concat(seedPrefix).concat(styleSheet.options.classNamePrefix, "-").concat(suffix);
    }
    return "".concat(seedPrefix).concat(suffix);
  };
}

// ../../node_modules/jss-plugin-rule-value-function/dist/jss-plugin-rule-value-function.esm.js
var now = Date.now();
var fnValuesNs = "fnValues" + now;
var fnRuleNs = "fnStyle" + ++now;
var functionPlugin = function functionPlugin2() {
  return {
    onCreateRule: function onCreateRule8(name, decl, options) {
      if (typeof decl !== "function")
        return null;
      var rule = createRule(name, {}, options);
      rule[fnRuleNs] = decl;
      return rule;
    },
    onProcessStyle: function onProcessStyle2(style, rule) {
      if (fnValuesNs in rule || fnRuleNs in rule)
        return style;
      var fnValues = {};
      for (var prop in style) {
        var value = style[prop];
        if (typeof value !== "function")
          continue;
        delete style[prop];
        fnValues[prop] = value;
      }
      rule[fnValuesNs] = fnValues;
      return style;
    },
    onUpdate: function onUpdate(data, rule, sheet, options) {
      var styleRule = rule;
      var fnRule = styleRule[fnRuleNs];
      if (fnRule) {
        styleRule.style = fnRule(data) || {};
        if (false) {
          for (var prop in styleRule.style) {
            if (typeof styleRule.style[prop] === "function") {
              false ? tiny_warning_esm_default(false, "[JSS] Function values inside function rules are not supported.") : void 0;
              break;
            }
          }
        }
      }
      var fnValues = styleRule[fnValuesNs];
      if (fnValues) {
        for (var _prop in fnValues) {
          styleRule.prop(_prop, fnValues[_prop](data), options);
        }
      }
    }
  };
};
var jss_plugin_rule_value_function_esm_default = functionPlugin;

// ../../node_modules/jss-plugin-global/dist/jss-plugin-global.esm.js
var at = "@global";
var atPrefix = "@global ";
var GlobalContainerRule = /* @__PURE__ */ function() {
  function GlobalContainerRule2(key, styles, options) {
    this.type = "global";
    this.at = at;
    this.rules = void 0;
    this.options = void 0;
    this.key = void 0;
    this.isProcessed = false;
    this.key = key;
    this.options = options;
    this.rules = new RuleList(_extends({}, options, {
      parent: this
    }));
    for (var selector in styles) {
      this.rules.add(selector, styles[selector]);
    }
    this.rules.process();
  }
  var _proto = GlobalContainerRule2.prototype;
  _proto.getRule = function getRule(name) {
    return this.rules.get(name);
  };
  _proto.addRule = function addRule(name, style, options) {
    var rule = this.rules.add(name, style, options);
    if (rule)
      this.options.jss.plugins.onProcessRule(rule);
    return rule;
  };
  _proto.indexOf = function indexOf(rule) {
    return this.rules.indexOf(rule);
  };
  _proto.toString = function toString() {
    return this.rules.toString();
  };
  return GlobalContainerRule2;
}();
var GlobalPrefixedRule = /* @__PURE__ */ function() {
  function GlobalPrefixedRule2(key, style, options) {
    this.type = "global";
    this.at = at;
    this.options = void 0;
    this.rule = void 0;
    this.isProcessed = false;
    this.key = void 0;
    this.key = key;
    this.options = options;
    var selector = key.substr(atPrefix.length);
    this.rule = options.jss.createRule(selector, style, _extends({}, options, {
      parent: this
    }));
  }
  var _proto2 = GlobalPrefixedRule2.prototype;
  _proto2.toString = function toString(options) {
    return this.rule ? this.rule.toString(options) : "";
  };
  return GlobalPrefixedRule2;
}();
var separatorRegExp = /\s*,\s*/g;
function addScope(selector, scope) {
  var parts = selector.split(separatorRegExp);
  var scoped = "";
  for (var i = 0; i < parts.length; i++) {
    scoped += scope + " " + parts[i].trim();
    if (parts[i + 1])
      scoped += ", ";
  }
  return scoped;
}
function handleNestedGlobalContainerRule(rule, sheet) {
  var options = rule.options, style = rule.style;
  var rules = style ? style[at] : null;
  if (!rules)
    return;
  for (var name in rules) {
    sheet.addRule(name, rules[name], _extends({}, options, {
      selector: addScope(name, rule.selector)
    }));
  }
  delete style[at];
}
function handlePrefixedGlobalRule(rule, sheet) {
  var options = rule.options, style = rule.style;
  for (var prop in style) {
    if (prop[0] !== "@" || prop.substr(0, at.length) !== at)
      continue;
    var selector = addScope(prop.substr(at.length), rule.selector);
    sheet.addRule(selector, style[prop], _extends({}, options, {
      selector
    }));
    delete style[prop];
  }
}
function jssGlobal() {
  function onCreateRule8(name, styles, options) {
    if (!name)
      return null;
    if (name === at) {
      return new GlobalContainerRule(name, styles, options);
    }
    if (name[0] === "@" && name.substr(0, atPrefix.length) === atPrefix) {
      return new GlobalPrefixedRule(name, styles, options);
    }
    var parent = options.parent;
    if (parent) {
      if (parent.type === "global" || parent.options.parent && parent.options.parent.type === "global") {
        options.scoped = false;
      }
    }
    if (options.scoped === false) {
      options.selector = name;
    }
    return null;
  }
  function onProcessRule(rule, sheet) {
    if (rule.type !== "style" || !sheet)
      return;
    handleNestedGlobalContainerRule(rule, sheet);
    handlePrefixedGlobalRule(rule, sheet);
  }
  return {
    onCreateRule: onCreateRule8,
    onProcessRule
  };
}
var jss_plugin_global_esm_default = jssGlobal;

// ../../node_modules/jss-plugin-nested/dist/jss-plugin-nested.esm.js
var separatorRegExp2 = /\s*,\s*/g;
var parentRegExp = /&/g;
var refRegExp2 = /\$([\w-]+)/g;
function jssNested() {
  function getReplaceRef(container, sheet) {
    return function(match, key) {
      var rule = container.getRule(key) || sheet && sheet.getRule(key);
      if (rule) {
        rule = rule;
        return rule.selector;
      }
      false ? tiny_warning_esm_default(false, '[JSS] Could not find the referenced rule "' + key + '" in "' + (container.options.meta || container.toString()) + '".') : void 0;
      return key;
    };
  }
  function replaceParentRefs(nestedProp, parentProp) {
    var parentSelectors = parentProp.split(separatorRegExp2);
    var nestedSelectors = nestedProp.split(separatorRegExp2);
    var result = "";
    for (var i = 0; i < parentSelectors.length; i++) {
      var parent = parentSelectors[i];
      for (var j = 0; j < nestedSelectors.length; j++) {
        var nested = nestedSelectors[j];
        if (result)
          result += ", ";
        result += nested.indexOf("&") !== -1 ? nested.replace(parentRegExp, parent) : parent + " " + nested;
      }
    }
    return result;
  }
  function getOptions(rule, container, prevOptions) {
    if (prevOptions)
      return _extends({}, prevOptions, {
        index: prevOptions.index + 1
      });
    var nestingLevel = rule.options.nestingLevel;
    nestingLevel = nestingLevel === void 0 ? 1 : nestingLevel + 1;
    var options = _extends({}, rule.options, {
      nestingLevel,
      index: container.indexOf(rule) + 1
    });
    delete options.name;
    return options;
  }
  function onProcessStyle2(style, rule, sheet) {
    if (rule.type !== "style")
      return style;
    var styleRule = rule;
    var container = styleRule.options.parent;
    var options;
    var replaceRef3;
    for (var prop in style) {
      var isNested = prop.indexOf("&") !== -1;
      var isNestedConditional = prop[0] === "@";
      if (!isNested && !isNestedConditional)
        continue;
      options = getOptions(styleRule, container, options);
      if (isNested) {
        var selector = replaceParentRefs(prop, styleRule.selector);
        if (!replaceRef3)
          replaceRef3 = getReplaceRef(container, sheet);
        selector = selector.replace(refRegExp2, replaceRef3);
        container.addRule(selector, style[prop], _extends({}, options, {
          selector
        }));
      } else if (isNestedConditional) {
        container.addRule(prop, {}, options).addRule(styleRule.key, style[prop], {
          selector: styleRule.selector
        });
      }
      delete style[prop];
    }
    return style;
  }
  return {
    onProcessStyle: onProcessStyle2
  };
}
var jss_plugin_nested_esm_default = jssNested;

// ../../node_modules/jss-plugin-camel-case/dist/jss-plugin-camel-case.esm.js
var import_hyphenate_style_name = __toModule(require_index_cjs());
function convertCase(style) {
  var converted = {};
  for (var prop in style) {
    var key = prop.indexOf("--") === 0 ? prop : import_hyphenate_style_name.default(prop);
    converted[key] = style[prop];
  }
  if (style.fallbacks) {
    if (Array.isArray(style.fallbacks))
      converted.fallbacks = style.fallbacks.map(convertCase);
    else
      converted.fallbacks = convertCase(style.fallbacks);
  }
  return converted;
}
function camelCase() {
  function onProcessStyle2(style) {
    if (Array.isArray(style)) {
      for (var index = 0; index < style.length; index++) {
        style[index] = convertCase(style[index]);
      }
      return style;
    }
    return convertCase(style);
  }
  function onChangeValue2(value, prop, rule) {
    if (prop.indexOf("--") === 0) {
      return value;
    }
    var hyphenatedProp = import_hyphenate_style_name.default(prop);
    if (prop === hyphenatedProp)
      return value;
    rule.prop(hyphenatedProp, value);
    return null;
  }
  return {
    onProcessStyle: onProcessStyle2,
    onChangeValue: onChangeValue2
  };
}
var jss_plugin_camel_case_esm_default = camelCase;

// ../../node_modules/jss-plugin-default-unit/dist/jss-plugin-default-unit.esm.js
var px = hasCSSTOMSupport && CSS ? CSS.px : "px";
var ms = hasCSSTOMSupport && CSS ? CSS.ms : "ms";
var percent = hasCSSTOMSupport && CSS ? CSS.percent : "%";
var defaultUnits = {
  "animation-delay": ms,
  "animation-duration": ms,
  "background-position": px,
  "background-position-x": px,
  "background-position-y": px,
  "background-size": px,
  border: px,
  "border-bottom": px,
  "border-bottom-left-radius": px,
  "border-bottom-right-radius": px,
  "border-bottom-width": px,
  "border-left": px,
  "border-left-width": px,
  "border-radius": px,
  "border-right": px,
  "border-right-width": px,
  "border-top": px,
  "border-top-left-radius": px,
  "border-top-right-radius": px,
  "border-top-width": px,
  "border-width": px,
  "border-block": px,
  "border-block-end": px,
  "border-block-end-width": px,
  "border-block-start": px,
  "border-block-start-width": px,
  "border-block-width": px,
  "border-inline": px,
  "border-inline-end": px,
  "border-inline-end-width": px,
  "border-inline-start": px,
  "border-inline-start-width": px,
  "border-inline-width": px,
  "border-start-start-radius": px,
  "border-start-end-radius": px,
  "border-end-start-radius": px,
  "border-end-end-radius": px,
  margin: px,
  "margin-bottom": px,
  "margin-left": px,
  "margin-right": px,
  "margin-top": px,
  "margin-block": px,
  "margin-block-end": px,
  "margin-block-start": px,
  "margin-inline": px,
  "margin-inline-end": px,
  "margin-inline-start": px,
  padding: px,
  "padding-bottom": px,
  "padding-left": px,
  "padding-right": px,
  "padding-top": px,
  "padding-block": px,
  "padding-block-end": px,
  "padding-block-start": px,
  "padding-inline": px,
  "padding-inline-end": px,
  "padding-inline-start": px,
  "mask-position-x": px,
  "mask-position-y": px,
  "mask-size": px,
  height: px,
  width: px,
  "min-height": px,
  "max-height": px,
  "min-width": px,
  "max-width": px,
  bottom: px,
  left: px,
  top: px,
  right: px,
  inset: px,
  "inset-block": px,
  "inset-block-end": px,
  "inset-block-start": px,
  "inset-inline": px,
  "inset-inline-end": px,
  "inset-inline-start": px,
  "box-shadow": px,
  "text-shadow": px,
  "column-gap": px,
  "column-rule": px,
  "column-rule-width": px,
  "column-width": px,
  "font-size": px,
  "font-size-delta": px,
  "letter-spacing": px,
  "text-indent": px,
  "text-stroke": px,
  "text-stroke-width": px,
  "word-spacing": px,
  motion: px,
  "motion-offset": px,
  outline: px,
  "outline-offset": px,
  "outline-width": px,
  perspective: px,
  "perspective-origin-x": percent,
  "perspective-origin-y": percent,
  "transform-origin": percent,
  "transform-origin-x": percent,
  "transform-origin-y": percent,
  "transform-origin-z": percent,
  "transition-delay": ms,
  "transition-duration": ms,
  "vertical-align": px,
  "flex-basis": px,
  "shape-margin": px,
  size: px,
  gap: px,
  grid: px,
  "grid-gap": px,
  "grid-row-gap": px,
  "grid-column-gap": px,
  "grid-template-rows": px,
  "grid-template-columns": px,
  "grid-auto-rows": px,
  "grid-auto-columns": px,
  "box-shadow-x": px,
  "box-shadow-y": px,
  "box-shadow-blur": px,
  "box-shadow-spread": px,
  "font-line-height": px,
  "text-shadow-x": px,
  "text-shadow-y": px,
  "text-shadow-blur": px
};
function addCamelCasedVersion(obj) {
  var regExp2 = /(-[a-z])/g;
  var replace = function replace2(str) {
    return str[1].toUpperCase();
  };
  var newObj = {};
  for (var _key in obj) {
    newObj[_key] = obj[_key];
    newObj[_key.replace(regExp2, replace)] = obj[_key];
  }
  return newObj;
}
var units = addCamelCasedVersion(defaultUnits);
function iterate(prop, value, options) {
  if (value == null)
    return value;
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      value[i] = iterate(prop, value[i], options);
    }
  } else if (typeof value === "object") {
    if (prop === "fallbacks") {
      for (var innerProp in value) {
        value[innerProp] = iterate(innerProp, value[innerProp], options);
      }
    } else {
      for (var _innerProp in value) {
        value[_innerProp] = iterate(prop + "-" + _innerProp, value[_innerProp], options);
      }
    }
  } else if (typeof value === "number") {
    var unit = options[prop] || units[prop];
    if (unit && !(value === 0 && unit === px)) {
      return typeof unit === "function" ? unit(value).toString() : "" + value + unit;
    }
    return value.toString();
  }
  return value;
}
function defaultUnit(options) {
  if (options === void 0) {
    options = {};
  }
  var camelCasedOptions = addCamelCasedVersion(options);
  function onProcessStyle2(style, rule) {
    if (rule.type !== "style")
      return style;
    for (var prop in style) {
      style[prop] = iterate(prop, style[prop], camelCasedOptions);
    }
    return style;
  }
  function onChangeValue2(value, prop) {
    return iterate(prop, value, camelCasedOptions);
  }
  return {
    onProcessStyle: onProcessStyle2,
    onChangeValue: onChangeValue2
  };
}
var jss_plugin_default_unit_esm_default = defaultUnit;

// ../../node_modules/css-vendor/dist/css-vendor.esm.js
var js = "";
var css = "";
var vendor = "";
var browser = "";
var isTouch = module_default && "ontouchstart" in document.documentElement;
if (module_default) {
  jsCssMap = {
    Moz: "-moz-",
    ms: "-ms-",
    O: "-o-",
    Webkit: "-webkit-"
  };
  _document$createEleme = document.createElement("p"), style = _document$createEleme.style;
  testProp = "Transform";
  for (var key in jsCssMap) {
    if (key + testProp in style) {
      js = key;
      css = jsCssMap[key];
      break;
    }
  }
  if (js === "Webkit" && "msHyphens" in style) {
    js = "ms";
    css = jsCssMap.ms;
    browser = "edge";
  }
  if (js === "Webkit" && "-apple-trailing-word" in style) {
    vendor = "apple";
  }
}
var jsCssMap;
var _document$createEleme;
var style;
var testProp;
var prefix = {
  js,
  css,
  vendor,
  browser,
  isTouch
};
function supportedKeyframes(key) {
  if (key[1] === "-")
    return key;
  if (prefix.js === "ms")
    return key;
  return "@" + prefix.css + "keyframes" + key.substr(10);
}
var appearence = {
  noPrefill: ["appearance"],
  supportedProperty: function supportedProperty(prop) {
    if (prop !== "appearance")
      return false;
    if (prefix.js === "ms")
      return "-webkit-" + prop;
    return prefix.css + prop;
  }
};
var colorAdjust = {
  noPrefill: ["color-adjust"],
  supportedProperty: function supportedProperty2(prop) {
    if (prop !== "color-adjust")
      return false;
    if (prefix.js === "Webkit")
      return prefix.css + "print-" + prop;
    return prop;
  }
};
var regExp = /[-\s]+(.)?/g;
function toUpper(match, c) {
  return c ? c.toUpperCase() : "";
}
function camelize(str) {
  return str.replace(regExp, toUpper);
}
function pascalize(str) {
  return camelize("-" + str);
}
var mask = {
  noPrefill: ["mask"],
  supportedProperty: function supportedProperty3(prop, style) {
    if (!/^mask/.test(prop))
      return false;
    if (prefix.js === "Webkit") {
      var longhand = "mask-image";
      if (camelize(longhand) in style) {
        return prop;
      }
      if (prefix.js + pascalize(longhand) in style) {
        return prefix.css + prop;
      }
    }
    return prop;
  }
};
var textOrientation = {
  noPrefill: ["text-orientation"],
  supportedProperty: function supportedProperty4(prop) {
    if (prop !== "text-orientation")
      return false;
    if (prefix.vendor === "apple" && !prefix.isTouch) {
      return prefix.css + prop;
    }
    return prop;
  }
};
var transform = {
  noPrefill: ["transform"],
  supportedProperty: function supportedProperty5(prop, style, options) {
    if (prop !== "transform")
      return false;
    if (options.transform) {
      return prop;
    }
    return prefix.css + prop;
  }
};
var transition = {
  noPrefill: ["transition"],
  supportedProperty: function supportedProperty6(prop, style, options) {
    if (prop !== "transition")
      return false;
    if (options.transition) {
      return prop;
    }
    return prefix.css + prop;
  }
};
var writingMode = {
  noPrefill: ["writing-mode"],
  supportedProperty: function supportedProperty7(prop) {
    if (prop !== "writing-mode")
      return false;
    if (prefix.js === "Webkit" || prefix.js === "ms" && prefix.browser !== "edge") {
      return prefix.css + prop;
    }
    return prop;
  }
};
var userSelect = {
  noPrefill: ["user-select"],
  supportedProperty: function supportedProperty8(prop) {
    if (prop !== "user-select")
      return false;
    if (prefix.js === "Moz" || prefix.js === "ms" || prefix.vendor === "apple") {
      return prefix.css + prop;
    }
    return prop;
  }
};
var breakPropsOld = {
  supportedProperty: function supportedProperty9(prop, style) {
    if (!/^break-/.test(prop))
      return false;
    if (prefix.js === "Webkit") {
      var jsProp = "WebkitColumn" + pascalize(prop);
      return jsProp in style ? prefix.css + "column-" + prop : false;
    }
    if (prefix.js === "Moz") {
      var _jsProp = "page" + pascalize(prop);
      return _jsProp in style ? "page-" + prop : false;
    }
    return false;
  }
};
var inlineLogicalOld = {
  supportedProperty: function supportedProperty10(prop, style) {
    if (!/^(border|margin|padding)-inline/.test(prop))
      return false;
    if (prefix.js === "Moz")
      return prop;
    var newProp = prop.replace("-inline", "");
    return prefix.js + pascalize(newProp) in style ? prefix.css + newProp : false;
  }
};
var unprefixed = {
  supportedProperty: function supportedProperty11(prop, style) {
    return camelize(prop) in style ? prop : false;
  }
};
var prefixed = {
  supportedProperty: function supportedProperty12(prop, style) {
    var pascalized = pascalize(prop);
    if (prop[0] === "-")
      return prop;
    if (prop[0] === "-" && prop[1] === "-")
      return prop;
    if (prefix.js + pascalized in style)
      return prefix.css + prop;
    if (prefix.js !== "Webkit" && "Webkit" + pascalized in style)
      return "-webkit-" + prop;
    return false;
  }
};
var scrollSnap = {
  supportedProperty: function supportedProperty13(prop) {
    if (prop.substring(0, 11) !== "scroll-snap")
      return false;
    if (prefix.js === "ms") {
      return "" + prefix.css + prop;
    }
    return prop;
  }
};
var overscrollBehavior = {
  supportedProperty: function supportedProperty14(prop) {
    if (prop !== "overscroll-behavior")
      return false;
    if (prefix.js === "ms") {
      return prefix.css + "scroll-chaining";
    }
    return prop;
  }
};
var propMap = {
  "flex-grow": "flex-positive",
  "flex-shrink": "flex-negative",
  "flex-basis": "flex-preferred-size",
  "justify-content": "flex-pack",
  order: "flex-order",
  "align-items": "flex-align",
  "align-content": "flex-line-pack"
};
var flex2012 = {
  supportedProperty: function supportedProperty15(prop, style) {
    var newProp = propMap[prop];
    if (!newProp)
      return false;
    return prefix.js + pascalize(newProp) in style ? prefix.css + newProp : false;
  }
};
var propMap$1 = {
  flex: "box-flex",
  "flex-grow": "box-flex",
  "flex-direction": ["box-orient", "box-direction"],
  order: "box-ordinal-group",
  "align-items": "box-align",
  "flex-flow": ["box-orient", "box-direction"],
  "justify-content": "box-pack"
};
var propKeys = Object.keys(propMap$1);
var prefixCss = function prefixCss2(p) {
  return prefix.css + p;
};
var flex2009 = {
  supportedProperty: function supportedProperty16(prop, style, _ref) {
    var multiple = _ref.multiple;
    if (propKeys.indexOf(prop) > -1) {
      var newProp = propMap$1[prop];
      if (!Array.isArray(newProp)) {
        return prefix.js + pascalize(newProp) in style ? prefix.css + newProp : false;
      }
      if (!multiple)
        return false;
      for (var i = 0; i < newProp.length; i++) {
        if (!(prefix.js + pascalize(newProp[0]) in style)) {
          return false;
        }
      }
      return newProp.map(prefixCss);
    }
    return false;
  }
};
var plugins2 = [appearence, colorAdjust, mask, textOrientation, transform, transition, writingMode, userSelect, breakPropsOld, inlineLogicalOld, unprefixed, prefixed, scrollSnap, overscrollBehavior, flex2012, flex2009];
var propertyDetectors = plugins2.filter(function(p) {
  return p.supportedProperty;
}).map(function(p) {
  return p.supportedProperty;
});
var noPrefill = plugins2.filter(function(p) {
  return p.noPrefill;
}).reduce(function(a, p) {
  a.push.apply(a, _toConsumableArray(p.noPrefill));
  return a;
}, []);
var el;
var cache = {};
if (module_default) {
  el = document.createElement("p");
  computed = window.getComputedStyle(document.documentElement, "");
  for (var key$1 in computed) {
    if (!isNaN(key$1))
      cache[computed[key$1]] = computed[key$1];
  }
  noPrefill.forEach(function(x) {
    return delete cache[x];
  });
}
var computed;
function supportedProperty17(prop, options) {
  if (options === void 0) {
    options = {};
  }
  if (!el)
    return prop;
  if (cache[prop] != null) {
    return cache[prop];
  }
  if (prop === "transition" || prop === "transform") {
    options[prop] = prop in el.style;
  }
  for (var i = 0; i < propertyDetectors.length; i++) {
    cache[prop] = propertyDetectors[i](prop, el.style, options);
    if (cache[prop])
      break;
  }
  try {
    el.style[prop] = "";
  } catch (err) {
    return false;
  }
  return cache[prop];
}
var cache$1 = {};
var transitionProperties = {
  transition: 1,
  "transition-property": 1,
  "-webkit-transition": 1,
  "-webkit-transition-property": 1
};
var transPropsRegExp = /(^\s*[\w-]+)|, (\s*[\w-]+)(?![^()]*\))/g;
var el$1;
function prefixTransitionCallback(match, p1, p2) {
  if (p1 === "var")
    return "var";
  if (p1 === "all")
    return "all";
  if (p2 === "all")
    return ", all";
  var prefixedValue = p1 ? supportedProperty17(p1) : ", " + supportedProperty17(p2);
  if (!prefixedValue)
    return p1 || p2;
  return prefixedValue;
}
if (module_default)
  el$1 = document.createElement("p");
function supportedValue(property, value) {
  var prefixedValue = value;
  if (!el$1 || property === "content")
    return value;
  if (typeof prefixedValue !== "string" || !isNaN(parseInt(prefixedValue, 10))) {
    return prefixedValue;
  }
  var cacheKey = property + prefixedValue;
  if (cache$1[cacheKey] != null) {
    return cache$1[cacheKey];
  }
  try {
    el$1.style[property] = prefixedValue;
  } catch (err) {
    cache$1[cacheKey] = false;
    return false;
  }
  if (transitionProperties[property]) {
    prefixedValue = prefixedValue.replace(transPropsRegExp, prefixTransitionCallback);
  } else if (el$1.style[property] === "") {
    prefixedValue = prefix.css + prefixedValue;
    if (prefixedValue === "-ms-flex")
      el$1.style[property] = "-ms-flexbox";
    el$1.style[property] = prefixedValue;
    if (el$1.style[property] === "") {
      cache$1[cacheKey] = false;
      return false;
    }
  }
  el$1.style[property] = "";
  cache$1[cacheKey] = prefixedValue;
  return cache$1[cacheKey];
}

// ../../node_modules/jss-plugin-vendor-prefixer/dist/jss-plugin-vendor-prefixer.esm.js
function jssVendorPrefixer() {
  function onProcessRule(rule) {
    if (rule.type === "keyframes") {
      var atRule = rule;
      atRule.at = supportedKeyframes(atRule.at);
    }
  }
  function prefixStyle(style) {
    for (var prop in style) {
      var value = style[prop];
      if (prop === "fallbacks" && Array.isArray(value)) {
        style[prop] = value.map(prefixStyle);
        continue;
      }
      var changeProp = false;
      var supportedProp = supportedProperty17(prop);
      if (supportedProp && supportedProp !== prop)
        changeProp = true;
      var changeValue = false;
      var supportedValue$1 = supportedValue(supportedProp, toCssValue(value));
      if (supportedValue$1 && supportedValue$1 !== value)
        changeValue = true;
      if (changeProp || changeValue) {
        if (changeProp)
          delete style[prop];
        style[supportedProp || prop] = supportedValue$1 || value;
      }
    }
    return style;
  }
  function onProcessStyle2(style, rule) {
    if (rule.type !== "style")
      return style;
    return prefixStyle(style);
  }
  function onChangeValue2(value, prop) {
    return supportedValue(prop, toCssValue(value)) || value;
  }
  return {
    onProcessRule,
    onProcessStyle: onProcessStyle2,
    onChangeValue: onChangeValue2
  };
}
var jss_plugin_vendor_prefixer_esm_default = jssVendorPrefixer;

// ../../node_modules/jss-plugin-props-sort/dist/jss-plugin-props-sort.esm.js
function jssPropsSort() {
  var sort = function sort2(prop0, prop1) {
    if (prop0.length === prop1.length) {
      return prop0 > prop1 ? 1 : -1;
    }
    return prop0.length - prop1.length;
  };
  return {
    onProcessStyle: function onProcessStyle2(style, rule) {
      if (rule.type !== "style")
        return style;
      var newStyle = {};
      var props = Object.keys(style).sort(sort);
      for (var i = 0; i < props.length; i++) {
        newStyle[props[i]] = style[props[i]];
      }
      return newStyle;
    }
  };
}
var jss_plugin_props_sort_esm_default = jssPropsSort;

// node_modules/@material-ui/styles/esm/jssPreset/jssPreset.js
function jssPreset() {
  return {
    plugins: [
      jss_plugin_rule_value_function_esm_default(),
      jss_plugin_global_esm_default(),
      jss_plugin_nested_esm_default(),
      jss_plugin_camel_case_esm_default(),
      jss_plugin_default_unit_esm_default(),
      typeof window === "undefined" ? null : jss_plugin_vendor_prefixer_esm_default(),
      jss_plugin_props_sort_esm_default()
    ]
  };
}

// node_modules/@material-ui/styles/esm/StylesProvider/StylesProvider.js
var jss2 = create(jssPreset());
var generateClassName = createGenerateClassName();
var sheetsManager = new Map();
var defaultOptions = {
  disableGeneration: false,
  generateClassName,
  jss: jss2,
  sheetsCache: null,
  sheetsManager,
  sheetsRegistry: null
};
var StylesContext = React.createContext(defaultOptions);
if (false) {
  StylesContext.displayName = "StylesContext";
}
false ? StylesProvider.propTypes = {
  children: import_prop_types2.default.node.isRequired,
  disableGeneration: import_prop_types2.default.bool,
  generateClassName: import_prop_types2.default.func,
  injectFirst: import_prop_types2.default.bool,
  jss: import_prop_types2.default.object,
  serverGenerateClassName: import_prop_types2.default.func,
  sheetsCache: import_prop_types2.default.object,
  sheetsManager: import_prop_types2.default.object,
  sheetsRegistry: import_prop_types2.default.object
} : void 0;
if (false) {
  false ? StylesProvider.propTypes = exactProp(StylesProvider.propTypes) : void 0;
}

// node_modules/@material-ui/styles/esm/getStylesCreator/noopTheme.js
var noopTheme = {};
var noopTheme_default = noopTheme;

// node_modules/@material-ui/styles/esm/getStylesCreator/getStylesCreator.js
function getStylesCreator(stylesOrCreator) {
  var themingEnabled = typeof stylesOrCreator === "function";
  if (false) {
    if (_typeof(stylesOrCreator) !== "object" && !themingEnabled) {
      console.error(["Material-UI: The `styles` argument provided is invalid.", "You need to provide a function generating the styles or a styles object."].join("\n"));
    }
  }
  return {
    create: function create4(theme, name) {
      var styles;
      try {
        styles = themingEnabled ? stylesOrCreator(theme) : stylesOrCreator;
      } catch (err) {
        if (false) {
          if (themingEnabled === true && theme === noopTheme_default) {
            console.error(["Material-UI: The `styles` argument provided is invalid.", "You are providing a function without a theme in the context.", "One of the parent elements needs to use a ThemeProvider."].join("\n"));
          }
        }
        throw err;
      }
      if (!name || !theme.overrides || !theme.overrides[name]) {
        return styles;
      }
      var overrides = theme.overrides[name];
      var stylesWithOverrides = _extends({}, styles);
      Object.keys(overrides).forEach(function(key) {
        if (false) {
          if (!stylesWithOverrides[key]) {
            console.warn(["Material-UI: You are trying to override a style that does not exist.", "Fix the `".concat(key, "` key of `theme.overrides.").concat(name, "`.")].join("\n"));
          }
        }
        stylesWithOverrides[key] = deepmerge(stylesWithOverrides[key], overrides[key]);
      });
      return stylesWithOverrides;
    },
    options: {}
  };
}

// node_modules/@material-ui/styles/esm/makeStyles/indexCounter.js
var indexCounter = -1e9;
function increment() {
  indexCounter += 1;
  if (false) {
    if (indexCounter >= 0) {
      console.warn(["Material-UI: You might have a memory leak.", "The indexCounter is not supposed to grow that much."].join("\n"));
    }
  }
  return indexCounter;
}

// node_modules/@material-ui/styles/esm/makeStyles/makeStyles.js
import React4 from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/styles/esm/mergeClasses/mergeClasses.js
function mergeClasses() {
  var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  var baseClasses = options.baseClasses, newClasses = options.newClasses, Component = options.Component;
  if (!newClasses) {
    return baseClasses;
  }
  var nextClasses = _extends({}, baseClasses);
  if (false) {
    if (typeof newClasses === "string") {
      console.error(["Material-UI: The value `".concat(newClasses, "` ") + "provided to the classes prop of ".concat(getDisplayName(Component), " is incorrect."), "You might want to use the className prop instead."].join("\n"));
      return baseClasses;
    }
  }
  Object.keys(newClasses).forEach(function(key) {
    if (false) {
      if (!baseClasses[key] && newClasses[key]) {
        console.error(["Material-UI: The key `".concat(key, "` ") + "provided to the classes prop is not implemented in ".concat(getDisplayName(Component), "."), "You can only override one of the following: ".concat(Object.keys(baseClasses).join(","), ".")].join("\n"));
      }
      if (newClasses[key] && typeof newClasses[key] !== "string") {
        console.error(["Material-UI: The key `".concat(key, "` ") + "provided to the classes prop is not valid for ".concat(getDisplayName(Component), "."), "You need to provide a non empty string instead of: ".concat(newClasses[key], ".")].join("\n"));
      }
    }
    if (newClasses[key]) {
      nextClasses[key] = "".concat(baseClasses[key], " ").concat(newClasses[key]);
    }
  });
  return nextClasses;
}

// node_modules/@material-ui/styles/esm/makeStyles/multiKeyStore.js
var multiKeyStore = {
  set: function set(cache2, key1, key2, value) {
    var subCache = cache2.get(key1);
    if (!subCache) {
      subCache = new Map();
      cache2.set(key1, subCache);
    }
    subCache.set(key2, value);
  },
  get: function get(cache2, key1, key2) {
    var subCache = cache2.get(key1);
    return subCache ? subCache.get(key2) : void 0;
  },
  delete: function _delete(cache2, key1, key2) {
    var subCache = cache2.get(key1);
    subCache.delete(key2);
  }
};
var multiKeyStore_default = multiKeyStore;

// node_modules/@material-ui/styles/esm/useTheme/useTheme.js
import React3 from "https://cdn.skypack.dev/react";

// node_modules/@material-ui/styles/esm/useTheme/ThemeContext.js
import React2 from "https://cdn.skypack.dev/react";
var ThemeContext = React2.createContext(null);
if (false) {
  ThemeContext.displayName = "ThemeContext";
}
var ThemeContext_default = ThemeContext;

// node_modules/@material-ui/styles/esm/useTheme/useTheme.js
function useTheme() {
  var theme = React3.useContext(ThemeContext_default);
  if (false) {
    React3.useDebugValue(theme);
  }
  return theme;
}

// node_modules/@material-ui/styles/esm/makeStyles/makeStyles.js
function getClasses(_ref, classes, Component) {
  var state = _ref.state, stylesOptions = _ref.stylesOptions;
  if (stylesOptions.disableGeneration) {
    return classes || {};
  }
  if (!state.cacheClasses) {
    state.cacheClasses = {
      value: null,
      lastProp: null,
      lastJSS: {}
    };
  }
  var generate = false;
  if (state.classes !== state.cacheClasses.lastJSS) {
    state.cacheClasses.lastJSS = state.classes;
    generate = true;
  }
  if (classes !== state.cacheClasses.lastProp) {
    state.cacheClasses.lastProp = classes;
    generate = true;
  }
  if (generate) {
    state.cacheClasses.value = mergeClasses({
      baseClasses: state.cacheClasses.lastJSS,
      newClasses: classes,
      Component
    });
  }
  return state.cacheClasses.value;
}
function attach(_ref2, props) {
  var state = _ref2.state, theme = _ref2.theme, stylesOptions = _ref2.stylesOptions, stylesCreator = _ref2.stylesCreator, name = _ref2.name;
  if (stylesOptions.disableGeneration) {
    return;
  }
  var sheetManager = multiKeyStore_default.get(stylesOptions.sheetsManager, stylesCreator, theme);
  if (!sheetManager) {
    sheetManager = {
      refs: 0,
      staticSheet: null,
      dynamicStyles: null
    };
    multiKeyStore_default.set(stylesOptions.sheetsManager, stylesCreator, theme, sheetManager);
  }
  var options = _extends({}, stylesCreator.options, stylesOptions, {
    theme,
    flip: typeof stylesOptions.flip === "boolean" ? stylesOptions.flip : theme.direction === "rtl"
  });
  options.generateId = options.serverGenerateClassName || options.generateClassName;
  var sheetsRegistry = stylesOptions.sheetsRegistry;
  if (sheetManager.refs === 0) {
    var staticSheet;
    if (stylesOptions.sheetsCache) {
      staticSheet = multiKeyStore_default.get(stylesOptions.sheetsCache, stylesCreator, theme);
    }
    var styles = stylesCreator.create(theme, name);
    if (!staticSheet) {
      staticSheet = stylesOptions.jss.createStyleSheet(styles, _extends({
        link: false
      }, options));
      staticSheet.attach();
      if (stylesOptions.sheetsCache) {
        multiKeyStore_default.set(stylesOptions.sheetsCache, stylesCreator, theme, staticSheet);
      }
    }
    if (sheetsRegistry) {
      sheetsRegistry.add(staticSheet);
    }
    sheetManager.staticSheet = staticSheet;
    sheetManager.dynamicStyles = getDynamicStyles(styles);
  }
  if (sheetManager.dynamicStyles) {
    var dynamicSheet = stylesOptions.jss.createStyleSheet(sheetManager.dynamicStyles, _extends({
      link: true
    }, options));
    dynamicSheet.update(props);
    dynamicSheet.attach();
    state.dynamicSheet = dynamicSheet;
    state.classes = mergeClasses({
      baseClasses: sheetManager.staticSheet.classes,
      newClasses: dynamicSheet.classes
    });
    if (sheetsRegistry) {
      sheetsRegistry.add(dynamicSheet);
    }
  } else {
    state.classes = sheetManager.staticSheet.classes;
  }
  sheetManager.refs += 1;
}
function update(_ref3, props) {
  var state = _ref3.state;
  if (state.dynamicSheet) {
    state.dynamicSheet.update(props);
  }
}
function detach(_ref4) {
  var state = _ref4.state, theme = _ref4.theme, stylesOptions = _ref4.stylesOptions, stylesCreator = _ref4.stylesCreator;
  if (stylesOptions.disableGeneration) {
    return;
  }
  var sheetManager = multiKeyStore_default.get(stylesOptions.sheetsManager, stylesCreator, theme);
  sheetManager.refs -= 1;
  var sheetsRegistry = stylesOptions.sheetsRegistry;
  if (sheetManager.refs === 0) {
    multiKeyStore_default.delete(stylesOptions.sheetsManager, stylesCreator, theme);
    stylesOptions.jss.removeStyleSheet(sheetManager.staticSheet);
    if (sheetsRegistry) {
      sheetsRegistry.remove(sheetManager.staticSheet);
    }
  }
  if (state.dynamicSheet) {
    stylesOptions.jss.removeStyleSheet(state.dynamicSheet);
    if (sheetsRegistry) {
      sheetsRegistry.remove(state.dynamicSheet);
    }
  }
}
function useSynchronousEffect(func, values2) {
  var key = React4.useRef([]);
  var output;
  var currentKey = React4.useMemo(function() {
    return {};
  }, values2);
  if (key.current !== currentKey) {
    key.current = currentKey;
    output = func();
  }
  React4.useEffect(function() {
    return function() {
      if (output) {
        output();
      }
    };
  }, [currentKey]);
}
function makeStyles(stylesOrCreator) {
  var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  var name = options.name, classNamePrefixOption = options.classNamePrefix, Component = options.Component, _options$defaultTheme = options.defaultTheme, defaultTheme2 = _options$defaultTheme === void 0 ? noopTheme_default : _options$defaultTheme, stylesOptions2 = _objectWithoutProperties(options, ["name", "classNamePrefix", "Component", "defaultTheme"]);
  var stylesCreator = getStylesCreator(stylesOrCreator);
  var classNamePrefix = name || classNamePrefixOption || "makeStyles";
  stylesCreator.options = {
    index: increment(),
    name,
    meta: classNamePrefix,
    classNamePrefix
  };
  var useStyles = function useStyles2() {
    var props = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    var theme = useTheme() || defaultTheme2;
    var stylesOptions = _extends({}, React4.useContext(StylesContext), stylesOptions2);
    var instance = React4.useRef();
    var shouldUpdate = React4.useRef();
    useSynchronousEffect(function() {
      var current = {
        name,
        state: {},
        stylesCreator,
        stylesOptions,
        theme
      };
      attach(current, props);
      shouldUpdate.current = false;
      instance.current = current;
      return function() {
        detach(current);
      };
    }, [theme, stylesCreator]);
    React4.useEffect(function() {
      if (shouldUpdate.current) {
        update(instance.current, props);
      }
      shouldUpdate.current = true;
    });
    var classes = getClasses(instance.current, props.classes, Component);
    if (false) {
      React4.useDebugValue(classes);
    }
    return classes;
  };
  return useStyles;
}

// node_modules/@material-ui/styles/esm/index.js
/** @license Material-UI v4.11.2
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
if (false) {
  ponyfillGlobal_default["__@material-ui/styles-init__"] = ponyfillGlobal_default["__@material-ui/styles-init__"] || 0;
  if (ponyfillGlobal_default["__@material-ui/styles-init__"] === 1) {
    console.warn(["It looks like there are several instances of `@material-ui/styles` initialized in this application.", "This may cause theme propagation issues, broken class names, specificity issues, and makes your application bigger without a good reason.", "", "See https://material-ui.com/r/styles-instance-warning for more info."].join("\n"));
  }
  ponyfillGlobal_default["__@material-ui/styles-init__"] += 1;
}

export {
  blue_default,
  common_default,
  green_default,
  grey_default,
  orange_default,
  pink_default,
  red_default,
  zIndex_default,
  nested_default,
  __defProp,
  _assertThisInitialized,
  _inheritsLoose,
  defaultTheme_default,
  duration,
  ThemeContext_default,
  _defineProperty,
  formatMuiErrorMessage,
  React,
  _extends,
  require_prop_types,
  clamp,
  useTheme,
  merge_default,
  _objectWithoutPropertiesLoose,
  _objectWithoutProperties,
  _createClass,
  _toConsumableArray,
  __markAsModule,
  _slicedToArray,
  clsx_m_default,
  require_index_cjs,
  jssPreset,
  StylesContext,
  __commonJS,
  handleBreakpoints,
  require_hoist_non_react_statics_cjs,
  __toModule,
  decomposeColor,
  createMuiTheme_default,
  spacing,
  recomposeColor,
  getLuminance,
  darken,
  lighten,
  makeStyles,
  create
};
//# sourceMappingURL=chunk.EIY6CZZE.js.map
