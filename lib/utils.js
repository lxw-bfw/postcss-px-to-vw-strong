function getUnit(prop, opts) {
  return prop.indexOf("font") === -1
    ? opts.viewportUnit
    : opts.fontViewportUnit;
}

/**
 *
 * @description {代码定义了一个用于替换 CSS 属性值中的像素单位为视口单位的函数 createPxReplace。该函数返回一个闭包，闭包中包含了对应的视口单位和视口大小。在闭包内部，首先检查匹配到的像素值是否存在，如果不存在则直接返回原始字符串。接着将匹配到的像素值转换为浮点数，并根据设定的最小像素值进行判断，若小于等于最小像素值，则返回原始字符串。然后计算转换后的值，将像素值转换为相应的视口单位，并保留指定的小数位数。最后，如果转换后的值为0，则直接返回0，否则返回转换后的值加上视口单位} opts
 * @param {*} viewportUnit 采用的视口单位
 * @param {*} viewportSize 使用的视口宽度
 * @returns
 */
function createPxReplace(opts, viewportUnit, viewportSize) {
  // replace方法中第二个参数，传递已给函数，匹配需要转换的情况是（16px为例） m:16px,$1是16，如果$1不存在的话要么是0，要么是属于不需要进行转换的几种情况
  return function (m, $1) {
    if (!$1) return m;
    const pixels = parseFloat($1); // 转换为浮点数
    if (pixels <= opts.minPixelValue) return m; // 如果像素值小于等于设置的最小像素值，则返回原始字符串
    const parsedVal = toFixed(
      (pixels / viewportSize) * 100,
      opts.unitPrecision
    ); // 计算转换后的值，并保留指定的小数位数
    return parsedVal === 0 ? "0" : parsedVal + viewportUnit; //  如果转换后的值为0，则直接返回0，否则返回转换后的值加上视口单位
  };
}

function createCustomUnitReplace(
  opts,
  customUnitOpts,
  landscapeUnit,
  landscapeWidth
) {
  const translateUnit = landscapeUnit ? landscapeUnit : opts.viewportUnit;
  const viewportWidth = landscapeWidth ? landscapeWidth : opts.viewportWidth;
  // unit, isOPenToViewPort, behavior
  const {
    realUnit, // 不开启视口转换时，真正使用的有效单位
    isOPenToViewPort,
    behavior = null,
  } = customUnitOpts;
  return function (m, $1) {
    if (!$1 && $1 !== 0) return m;
    const { handleValue } = behavior ? behavior($1) : {};
    const pixels = parseFloat(handleValue ? handleValue : $1); // 转换为浮点数
    if (pixels <= opts.minPixelValue || !isOPenToViewPort)
      return pixels + realUnit;

    const parsedVal = toFixed(
      (pixels / viewportWidth) * 100,
      opts.unitPrecision
    ); // 计算转换后的值，并保留指定的小数位数
    return parsedVal === 0 ? "0" : parsedVal + translateUnit;
  };
}

function error(decl, message) {
  throw decl.error(message, { plugin: "postcss-px-to-viewport" });
}

function checkRegExpOrArray(options, optionName) {
  const option = options[optionName];
  if (!option) return;
  //使用toString来对对象的具体类型做比较，[object RegExp]表示当前类型是一个正则表达式，符合exclude和include的参数类型，直接返回
  if (Object.prototype.toString.call(option) === "[object RegExp]") return;
  // 如果是数组类型，那么数组中的每个元素类型必须是正则表达式，否则抛出异常
  if (Object.prototype.toString.call(option) === "[object Array]") {
    let bad = false;
    for (let i = 0; i < option.length; i++) {
      if (Object.prototype.toString.call(option[i]) !== "[object RegExp]") {
        bad = true;
        break;
      }
    }
    if (!bad) return;
  }
  throw new Error(
    "options." + optionName + " should be RegExp or Array of RegExp."
  );
}

function toFixed(number, precision) {
  const multiplier = Math.pow(10, precision + 1),
    wholeNumber = Math.floor(number * multiplier);
  return (Math.round(wholeNumber / 10) * 10) / multiplier;
}

function blacklistedSelector(blacklist, selector) {
  if (typeof selector !== "string") return;
  return blacklist.some(function (regex) {
    if (typeof regex === "string") return selector.indexOf(regex) !== -1;
    return selector.match(regex);
  });
}

function declarationExists(decls, prop, value) {
  return decls.some(function (decl) {
    return decl.prop === prop && decl.value === value;
  });
}

function validateParams(params, mediaQuery) {
  return !params || (params && mediaQuery);
}

module.exports = {
  getUnit,
  createPxReplace,
  createCustomUnitReplace,
  error,
  checkRegExpOrArray,
  toFixed,
  blacklistedSelector,
  declarationExists,
  validateParams,
};
