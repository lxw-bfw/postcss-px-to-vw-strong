import type { CustomUnit, OptionType, ParentExtendType } from '../types'

export const getUnit = (prop: string | string[], opts: OptionType) => {
  return prop.indexOf('font') === -1 ? opts.viewportUnit : opts.fontViewportUnit
}

export const toFixed = (number: number, precision: number) => {
  const multiplier = 10 ** (precision + 1)
  const wholeNumber = Math.floor(number * multiplier)
  return (Math.round(wholeNumber / 10) * 10) / multiplier
}

/**
 *
 * @description {代码定义了一个用于替换 CSS 属性值中的像素单位为视口单位的函数 createPxReplace。该函数返回一个闭包，闭包中包含了对应的视口单位和视口大小。在闭包内部，首先检查匹配到的像素值是否存在，如果不存在则直接返回原始字符串。接着将匹配到的像素值转换为浮点数，并根据设定的最小像素值进行判断，若小于等于最小像素值，则返回原始字符串。然后计算转换后的值，将像素值转换为相应的视口单位，并保留指定的小数位数。最后，如果转换后的值为0，则直接返回0，否则返回转换后的值加上视口单位} opts
 * @param {*} viewportUnit 采用的视口单位
 * @param {*} viewportSize 使用的视口宽度
 * @returns
 */
export const createPxReplace = (opts: OptionType, viewportUnit: string | number, viewportSize: number) => {
  // replace方法中第二个参数，传递一个函数以参数形式接收全匹配和第一个捕获组，匹配需要转换的情况是（16px为例） m:16px,$1是16，如果$1不存在的话要么是0，要么是属于不需要进行转换的几种情况
  return (m: string, $1: string | undefined) => {
    if (!$1) return m
    const pixels = parseFloat($1) // 转换为浮点数
    if (pixels <= opts.minPixelValue!) return m // 如果像素值小于等于设置的最小像素值，则返回原始字符串
    const parsedVal = toFixed((pixels / viewportSize) * 100, opts.unitPrecision!) // 计算转换后的值，并保留指定的小数位数
    return parsedVal === 0 ? '0' : `${parsedVal}${viewportUnit}` //  如果转换后的值为0，则直接返回0，否则返回转换后的值加上视口单位
  }
}

export const createCustomUnitReplace = (
  opts: OptionType,
  customUnitOpts: CustomUnit,
  landscapeUnit: string | number | null = null,
  landscapeWidth: number | null = null
) => {
  const translateUnit = landscapeUnit || opts.viewportUnit
  const viewportWidth = landscapeWidth || opts.viewportWidth
  const {
    realUnit, // 不开启视口转换时，真正使用的有效单位
    isOPenToViewPort,
    behavior = null,
  } = customUnitOpts
  return (m: string, $1: string | undefined) => {
    if (!$1 && $1 !== '0') return m
    const handleValue: string = behavior ? behavior(parseFloat($1)) : ''
    const pixels = parseFloat(handleValue || $1) // 转换为浮点数
    if (pixels <= opts.minPixelValue! || !isOPenToViewPort) return pixels + realUnit!

    const parsedVal = toFixed((pixels / viewportWidth!) * 100, opts.unitPrecision!) // 计算转换后的值，并保留指定的小数位数
    return parsedVal === 0 ? '0' : `${parsedVal}${translateUnit}`
  }
}

export const blacklistedSelector = (blacklist: string[], selector: string) => {
  if (typeof selector !== 'string') return false
  return blacklist.some((regex) => {
    if (typeof regex === 'string') return selector.indexOf(regex) !== -1
    return selector.match(regex)
  })
}

export const declarationExists = (decls: ParentExtendType[], prop: string, value: string) => {
  return decls.some((decl) => {
    return decl.prop === prop && decl.value === value
  })
}

export const validateParams = (params: string, mediaQuery: boolean) => {
  return !params || (params && mediaQuery)
}
