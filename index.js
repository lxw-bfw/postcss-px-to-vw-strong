const { getUnitRegexp } = require("./lib/pixel-unit-regexp");
const { createPropListMatcher } = require("./lib/prop-list-matcher");
const {
  checkRegExpOrArray,
  blacklistedSelector,
  createPxReplace,
  validateParams,
  getUnit,
  declarationExists,
} = require("./lib/utils");

const defaults = {
  unitToConvert: "px",
  viewportWidth: 320,
  unitPrecision: 5,
  viewportUnit: "vw",
  fontViewportUnit: "vw",
  selectorBlackList: [],
  propList: ["*"],
  minPixelValue: 1,
  mediaQuery: false,
  replace: true,
  landscape: false,
  landscapeUnit: "vw",
  landscapeWidth: 568,
};

const ignoreNextComment = "px-to-viewport-ignore-next";
const ignorePrevComment = "px-to-viewport-ignore";

/**
 * @type {import('postcss').PluginCreator}
 */
module.exports = (options = {}) => {
  // Work with options here
  console.log("传入的配置参数", options);

  const opts = Object.assign({}, defaults, options);

  console.log("合并后的参数", opts);

  // checkRegExpOrArray方法检测exclude和include选项类型是否正确。
  checkRegExpOrArray(opts, "exclude");
  checkRegExpOrArray(opts, "include");

  // 用以匹配属性值的转换单位正则，比如`font-size:12px`，匹配到12px
  const pxRegex = getUnitRegexp(opts.unitToConvert);

  // 过滤属性列表规则
  const satisfyPropList = createPropListMatcher(opts.propList);

  //存储横屏媒体查询的所有样式，用以开启横屏模式下，自动添加横屏媒体查询，将所有单位转换的样式加入进去
  const landscapeRules = [];

  return {
    postcssPlugin: "postcss-px-to-vw-strong",

    Once(root, { result, AtRule }) {
      // 只执行一次
      console.log("进入Once");
      root.walkRules((rule) => {
        const file = rule.source && rule.source.input.file;
        console.log("curRule file", file);
        if (opts.include && file) {
          if (
            Object.prototype.toString.call(opts.include) === "[object RegExp]"
          ) {
            if (!opts.include.test(file)) return;
          } else if (
            Object.prototype.toString.call(opts.include) === "[object Array]"
          ) {
            let flag = false;
            for (let i = 0; i < opts.include.length; i++) {
              if (opts.include[i].test(file)) {
                flag = true;
                break;
              }
            }
            if (!flag) return;
          }
        }

        if (opts.exclude && file) {
          if (
            Object.prototype.toString.call(opts.exclude) === "[object RegExp]"
          ) {
            if (opts.exclude.test(file)) return;
          } else if (
            Object.prototype.toString.call(opts.exclude) === "[object Array]"
          ) {
            for (let i = 0; i < opts.exclude.length; i++) {
              if (opts.exclude[i].test(file)) return;
            }
          }
        }

        if (blacklistedSelector(opts.selectorBlackList, rule.selector)) return;

        // 是否支持横屏进行单位转换
        if (opts.landscape && !rule.parent.params) {
          //创建了一个当前规则的克隆，并清空了其中的所有节点。这样做是为了创建一个新的规则，以便将横屏模式下的样式添加到其中
          var landscapeRule = rule.clone().removeAll();

          // 开始遍历当前每个规则中的每个声明
          rule.walkDecls((decl) => {
            // 检查声明的值是否包含了要转换的单位（默认是像素）
            if (decl.value.indexOf(opts.unitToConvert) === -1) return;
            // 检查声明的属性是否在允许转换的属性列表中
            if (!satisfyPropList(decl.prop)) return;
            //  克隆了当前声明，并替换了其值。替换的过程是将声明中的像素单位转换为视窗单位，同时考虑了横屏模式下的视窗宽度。然后将修改后的声明添加到横屏规则中
            landscapeRule.append(
              decl.clone({
                value: decl.value.replace(
                  pxRegex, //匹配属性值是否包含转换单位，比如font-size:16px,直接匹配到16px
                  // createPxReplace返回一个替换规则的函数，来替换匹配到的结果，比如16px
                  createPxReplace(opts, opts.landscapeUnit, opts.landscapeWidth)
                ),
              })
            );
          });

          // 查看克隆的用以添加到横屏媒体查询的规则是否不为空，如果不为空，
          if (landscapeRule.nodes.length > 0) {
            // landscapeRules数组存储遍历的每一个规则的克隆，这些克隆后的规则会添加到单位转换后的样式
            landscapeRules.push(landscapeRule);
          }
        }

        // 当前规则在一个媒体查询规则内部且用户没有开启mediaQuery,不做处理
        if (!validateParams(rule.parent.params, opts.mediaQuery)) return;

        //遍历每个规则的每一个声明，decl代表每一个声明对象，i代表该声明在规则内的索引位置
        rule.walkDecls((decl, i) => {
          if (decl.value.indexOf(opts.unitToConvert) === -1) return;
          if (!satisfyPropList(decl.prop)) return;

          /**
           * 处理忽略下一个转换的注释。如果前一个节点是注释且注释内容为 ignoreNextComment，则删除该注释，并返回，表示忽略下一个转换。
           */
          var prev = decl.prev();
          // prev declaration is ignore conversion comment at same line
          if (
            prev &&
            prev.type === "comment" &&
            prev.text === ignoreNextComment
          ) {
            // remove comment
            prev.remove();
            return;
          }

          /**
           * 用于处理忽略前一个转换的注释。如果后一个节点是注释且注释内容为 ignorePrevComment，则检查是否在同一行，如果是，则删除该注释，并返回，表示忽略前一个转换。
           */
          var next = decl.next();
          // next declaration is ignore conversion comment at same line
          if (
            next &&
            next.type === "comment" &&
            next.text === ignorePrevComment
          ) {
            if (/\n/.test(next.raws.before)) {
              result.warn(
                "Unexpected comment /* " +
                  ignorePrevComment +
                  " */ must be after declaration at same line.",
                { node: next }
              );
            } else {
              // remove comment
              next.remove();
              return;
            }
          }

          // 横屏和非横屏两种情况的视口宽度和转换单位判断
          var unit;
          var size;
          var params = rule.parent.params;

          if (opts.landscape && params && params.indexOf("landscape") !== -1) {
            unit = opts.landscapeUnit;
            size = opts.landscapeWidth;
          } else {
            unit = getUnit(decl.prop, opts);
            size = opts.viewportWidth;
          }

          //用于替换声明中的像素单位为相应的单位，使用 createPxReplace 函数来生成替换函数。
          var value = decl.value.replace(
            pxRegex,
            createPxReplace(opts, unit, size)
          );

          // 避免循环处理
          if (declarationExists(decl.parent, decl.prop, value)) return;

          // replace默认是true，决定单位转换是采用直接覆盖原属性值还是采用在需要替换的属性值的声明语句后面再插入一个声明进行覆盖
          if (opts.replace) {
            decl.value = value;
          } else {
            decl.parent.insertAfter(i, decl.clone({ value: value }));
          }
        });
      });

      // 这段代码用于处理横屏模式下的规则。如果存在横屏模式下的规则，则创建一个 @media (orientation: landscape) 的规则，并将横屏规则添加到其中，最后将该规则添加到 CSS 中。
      if (landscapeRules.length > 0) {
        const landscapeRoot = new AtRule({
          params: "(orientation: landscape)",
          name: "media",
        });

        landscapeRules.forEach((rule) => {
          landscapeRoot.append(rule);
        });
        root.append(landscapeRoot);
      }
    },

    /*
    Declaration (decl, postcss) {
      // The faster way to find Declaration node
    }
    */
  };
};

module.exports.postcss = true;
