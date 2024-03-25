import { AtRule, Root, Rule, Declaration, Helpers } from 'postcss'
import { getUnitRegexp } from './lib/pixel-unit-regexp'
import { createPropListMatcher } from './lib/prop-list-matcher'

import { blacklistedSelector, createPxReplace, validateParams, getUnit, declarationExists, createCustomUnitReplace } from './lib/utils'
import { OptionType, RuleType, ParentExtendType, CustomUnit } from './types'

type Decl = { selector: string } & Declaration

const defaults: OptionType = {
  unitToConvert: 'px',
  viewportWidth: 320,
  unitPrecision: 5,
  viewportUnit: 'vw',
  fontViewportUnit: 'vw',
  selectorBlackList: [],
  propList: ['*'],
  minPixelValue: 1,
  mediaQuery: false,
  replace: true,
  landscape: false,
  landscapeUnit: 'vw',
  landscapeWidth: 568,
  customUnit: null, // 自定义单位
}

const ignoreNextComment = 'px-to-viewport-ignore-next'
const ignorePrevComment = 'px-to-viewport-ignore'

/**
 * @type {import('postcss').PluginCreator}
 */
const postcssPxToViewport = (options: OptionType = {}) => {
  const opts = { ...defaults, ...options }

  // 用以匹配属性值的转换单位正则，排除覆盖了双引号和单引号以及url的情况，比如url(12px.jpg)不会转换
  const pxRegex = getUnitRegexp(opts.unitToConvert!)

  // 过滤属性列表规则
  const satisfyPropList = createPropListMatcher(opts.propList!)

  // 存储横屏媒体查询的所有样式，用以开启横屏模式下，自动添加横屏媒体查询，将所有单位转换的样式加入进去
  const landscapeRules: Rule[] = []

  const landscapeDecls: Decl[] = []

  return {
    postcssPlugin: 'postcss-px-to-vw-strong',

    Once(root: Root, helper: Helpers) {
      // 只执行一次
      // @ts-expect-error 补充类型
      root.walkRules((rule: RuleType) => {
        const file = rule.source && rule.source.input.file
        if (opts.include && file) {
          if (Object.prototype.toString.call(opts.include) === '[object RegExp]') {
            if (!(opts.include as RegExp).test(file)) return
          } else if (Object.prototype.toString.call(opts.include) === '[object Array]') {
            let flag = false
            // eslint-disable-next-line no-plusplus
            for (let i = 0; i < (opts.include as RegExp[]).length; i++) {
              if ((opts.include as RegExp[])[i].test(file)) {
                flag = true
                break
              }
            }
            if (!flag) return
          }
        }

        if (opts.exclude && file) {
          if (Object.prototype.toString.call(opts.exclude) === '[object RegExp]') {
            if ((opts.exclude as RegExp).test(file)) return
          } else if (Object.prototype.toString.call(opts.exclude) === '[object Array]') {
            // eslint-disable-next-line no-plusplus
            for (let i = 0; i < (opts.exclude as RegExp[]).length; i++) {
              if ((opts.exclude as RegExp[])[i].test(file)) return
            }
          }
        }

        if (blacklistedSelector(opts.selectorBlackList!, rule.selector)) return

        // 是否支持横屏进行单位转换
        if (opts.landscape && !rule.parent?.params) {
          // 创建了一个当前规则的克隆，并清空了其中的所有节点。这样做是为了创建一个新的规则，以便将横屏模式下的样式添加到其中
          const landscapeRule = rule.clone().removeAll()

          // 开始遍历当前每个规则中的每个声明
          rule.walkDecls((decl) => {
            // 检查声明的值是否包含了要转换的单位（默认是像素）
            if (decl.value.indexOf(opts.unitToConvert!) === -1) return
            // 检查声明的属性是否在允许转换的属性列表中
            if (!satisfyPropList(decl.prop)) return
            //  克隆了当前声明，并替换了其值。替换的过程是将声明中的像素单位转换为视窗单位，同时考虑了横屏模式下的视窗宽度。然后将修改后的声明添加到横屏规则中
            landscapeRule.append(
              decl.clone({
                value: decl.value.replace(
                  pxRegex, // 匹配属性值是否包含转换单位，比如font-size:16px,直接匹配到16px
                  // createPxReplace返回一个替换规则的函数，来替换匹配到的结果，比如16px
                  createPxReplace(opts, opts.landscapeUnit!, opts.landscapeWidth!)
                ),
              })
            )
          })

          // 查看克隆的用以添加到横屏媒体查询的规则是否不为空，如果不为空，
          if (landscapeRule.nodes.length > 0) {
            // landscapeRules数组存储遍历的每一个规则的克隆，这些克隆后的规则会添加到单位转换后的样式
            landscapeRules.push(landscapeRule)
          }
        }

        // 当前规则在一个媒体查询规则内部且用户没有开启mediaQuery,不做处理
        if (!validateParams(rule.parent.params, opts.mediaQuery!)) return

        // 遍历每个规则的每一个声明，decl代表每一个声明对象，i代表该声明在规则内的索引位置
        rule.walkDecls((decl, i) => {
          if (decl.value.indexOf(opts.unitToConvert!) === -1) return
          if (!satisfyPropList(decl.prop)) return

          /**
           * 处理忽略下一个转换的注释。如果前一个节点是注释且注释内容为 ignoreNextComment，则删除该注释，并返回，表示忽略下一个转换。
           */
          const prev = decl.prev()
          // prev declaration is ignore conversion comment at same line
          if (prev && prev.type === 'comment' && prev.text === ignoreNextComment) {
            // remove comment
            prev.remove()
            return
          }

          /**
           * 用于处理忽略前一个转换的注释。如果后一个节点是注释且注释内容为 ignorePrevComment，则检查是否在同一行，如果是，则删除该注释，并返回，表示忽略前一个转换。
           */
          const next = decl.next()
          // next declaration is ignore conversion comment at same line
          if (next && next.type === 'comment' && next.text === ignorePrevComment) {
            if (/\n/.test(next.raws.before!)) {
              helper.result.warn(`Unexpected comment /* ${ignorePrevComment} */ must be after declaration at same line.`, { node: next })
            } else {
              // remove comment
              next.remove()
              return
            }
          }

          // 横屏和非横屏两种情况的视口宽度和转换单位判断
          let unit
          let size
          const { params } = rule.parent

          if (opts.landscape && params && params.indexOf('landscape') !== -1) {
            unit = opts.landscapeUnit
            size = opts.landscapeWidth
          } else {
            unit = getUnit(decl.prop, opts)
            size = opts.viewportWidth
          }

          // 用于替换声明中的像素单位为相应的单位，使用 createPxReplace 函数来生成替换函数。
          const value = decl.value.replace(pxRegex, createPxReplace(opts, unit!, size!))

          // 避免循环处理
          if (declarationExists(decl.parent as unknown as ParentExtendType[], decl.prop, value)) return

          // replace默认是true，决定单位转换是采用直接覆盖原属性值还是采用在需要替换的属性值的声明语句后面再插入一个声明进行覆盖
          if (opts.replace) {
            // eslint-disable-next-line no-param-reassign
            decl.value = value
          } else {
            decl.parent?.insertAfter(i, decl.clone({ value }))
          }
        })
      })

      // 这段代码用于处理横屏模式下的规则。如果存在横屏模式下的规则，则创建一个 @media (orientation: landscape) 的规则，并将横屏规则添加到其中，最后将该规则添加到 CSS 中。
      if (landscapeRules.length > 0) {
        const landscapeRoot = new helper.AtRule({
          params: '(orientation: landscape)',
          name: 'media',
        })

        landscapeRules.forEach((rule) => {
          landscapeRoot.append(rule)
        })
        root.append(landscapeRoot)
      }
    },

    Declaration(decl: Declaration) {
      /**
       * 扩展—自定义单元功能
       * 自定义单位转换功能不受媒体查询规则、过滤属性列表、选择器、include和exclude等配置影响
       * 如果开启横屏模式，那么普通规则下匹配到的声明也会加入到横屏媒体查询中
       */
      const { customUnit } = opts
      if (!customUnit) {
        return
      }
      const defaultCustomUnitOpts = {
        realUnit: 'px',
        isOPenToViewPort: true,
        joinString: '',
      }
      const customUnitOpts: CustomUnit = {
        ...defaultCustomUnitOpts,
        ...customUnit,
      }
      const { name, joinString } = customUnitOpts

      const customUnitRegex = /\d+nx/

      if (!decl.value.match(customUnitRegex)) {
        return
      }

      const customUnitReplaceRegex = getUnitRegexp(name)
      // @ts-expect-error 处理父级的父级
      if (opts.landscape && !decl.parent?.parent?.params) {
        // 横屏模式下，处理自定义单位转换
        landscapeDecls.push(
          // @ts-expect-error 使用自定义类型Decl
          decl.clone({
            // @ts-expect-error 增加selector
            selector: decl.parent?.selector,
            value:
              decl.value.replace(
                customUnitReplaceRegex,
                createCustomUnitReplace(opts, customUnitOpts, opts.landscapeUnit!, opts.landscapeWidth!)
              ) + joinString,
          })
        )
      }

      const replaceValue = decl.value.replace(customUnitReplaceRegex, createCustomUnitReplace(opts, customUnitOpts))
      // eslint-disable-next-line no-param-reassign
      decl.value = replaceValue + joinString
    },
    OnceExit: (root: Root, helper: Helpers) => {
      // 扩展—自定义单位功能，加入到横屏媒体查询

      const { customUnit } = opts
      if (!customUnit || landscapeDecls.length === 0) {
        return
      }
      const landscapeDeclRules = landscapeDecls.reduce((acc: Decl[], item) => {
        const node = acc.find((res) => res.selector === item.selector)
        if (node) {
          // 如果已经存在这个选择器，则将值添加到nodes数组中
          // @ts-expect-error 扩展类型nodes
          if (!node.nodes) {
            // @ts-expect-error 扩展类型nodes
            node.nodes = []
          }
          // @ts-expect-error 扩展类型nodes
          node.nodes.push({ ...item })
        } else {
          // 如果不存在这个选择器，则直接添加到结果数组中
          acc.push({
            selector: item.selector,
            // @ts-expect-error 扩展类型nodes
            nodes: [{ ...item }],
          })
        }
        return acc
      }, [])

      const landscapeCustomUnitRules = landscapeDeclRules.map((value) => {
        const newRule = new helper.Rule({
          source: root.source,
          selector: value.selector,
        })
        return newRule
      })
      landscapeCustomUnitRules.forEach((rule) => {
        landscapeDecls.forEach((decl) => {
          if (decl.selector === rule.selector) {
            rule.append(decl)
          }
        })
      })

      let landscapeMedia: AtRule | null = null

      // 遍历根节点下的所有节点，找到是否已经存在横屏媒体查询
      root.nodes.forEach((node) => {
        // 判断节点是否为媒体查询节点，并且媒体查询条件为横屏
        if (node.type === 'atrule' && node.name === 'media' && node.params.includes('landscape')) {
          // 找到符合条件的横屏媒体查询节点，将其赋值给 landscapeMedia
          landscapeMedia = node
          // 终止遍历
          return false
        }
      })

      if (!landscapeMedia) {
        root.append(
          new helper.AtRule({
            params: '(orientation: landscape)',
            name: 'media',
          })
        )
        root.nodes.forEach((node) => {
          // 判断节点是否为媒体查询节点，并且媒体查询条件为横屏
          if (node.type === 'atrule' && node.name === 'media' && node.params.includes('landscape')) {
            // 找到符合条件的横屏媒体查询节点，将其赋值给 landscapeMedia
            landscapeMedia = node
            // 终止遍历
            return false
          }
        })
      }

      // @ts-expect-error 扩展类型nodes
      const atRuleSelectors = landscapeMedia.nodes ? landscapeMedia.nodes.map((rule) => rule.selector) : []

      landscapeCustomUnitRules.forEach((lRule) => {
        if (!atRuleSelectors.includes(lRule.selector)) {
          landscapeMedia?.append(lRule)
        } else {
          // @ts-expect-error 扩展类型nodes
          const hasRule = landscapeMedia?.nodes.find((rule) => {
            // @ts-expect-error 扩展类型nodes
            return rule.selector === lRule.selector
          })
          // @ts-expect-error 扩展类型nodes
          const hasRuleDeclPros = hasRule?.nodes.filter((node) => node.type === 'decl').map((node) => node.prop)

          lRule.nodes.forEach((decl) => {
            // @ts-expect-error 扩展类型prop
            if (!hasRuleDeclPros.includes(decl.prop) && hasRule) {
              // @ts-expect-error 扩展类型append
              hasRule.append(decl)
            }
          })
        }
      })
    },
  }
}

postcssPxToViewport.postcss = true
module.exports = postcssPxToViewport
export default postcssPxToViewport
