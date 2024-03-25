/**
 * @description:匹配任何包含双引号、单引号、url() 函数或数字后跟 unit(默认px) 的字符串
 *
 * @param {*} unit
 * @returns
 */
function getUnitRegexp(unit: string): RegExp {
  /**
   * \"[^"]+" | \'[^\']+\'  匹配字符串中双引号或单引号之间的单位，比如 "12px" or '12px'
   * url\\([^\\)]+\\) 这部分匹配 url() 函数中的内容。例如，它会匹配 url(image.png)。
   * (\\d*\\.?\\d+) 这部分匹配任何数字，包括小数。例如，它会匹配 12 或 3.5。
   * 最后unit 参数被添加到正则表达式中，用于匹配这些以此单位结尾的字符串（属性值）（如 12px）
   */
  return new RegExp(`"[^"]+"|'[^']+'|url\\([^\\)]+\\)|(\\d*\\.?\\d+)${unit}`, 'g')
}

export { getUnitRegexp }
