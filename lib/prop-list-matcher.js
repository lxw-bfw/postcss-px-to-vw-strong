/**
 * 定义了一个属性列表匹配器和相关的过滤方法。在 createPropListMatcher 函数中，
 * 根据传入的属性列表，创建一个匹配器函数，用于检查给定的属性是否与属性列表匹配。具体来说：
 *
 * filterPropList 对象包含了各种过滤属性列表的方法，如精确匹配、包含通配符的匹配、以通配符结尾的匹配等。
 * createPropListMatcher 函数用于创建属性列表匹配器，根据传入的属性列表，生成一个匹配函数。该函数用于检查给定的属性是否匹配属性列表中的任何条件。
 *
 */

// 这里定义了一个名为 filterPropList 的对象，包含了各种过滤属性列表的方法
const filterPropList = {
  // 精确匹配，不含通配符或否定符
  exact: function (list) {
    return list.filter(function (m) {
      return m.match(/^[^*!]+$/);
    });
  },
  // 包含通配符 * 的匹配，包含规则，只要属性包含这部分就符合
  // 这里是把属于包含关系的字符串提取出来，存放在contain数组里面
  contain: function (list) {
    return list
      .filter(function (m) {
        return m.match(/^\*.+\*$/);
      })
      .map(function (m) {
        return m.substr(1, m.length - 2);
      });
  },
  // 以通配符 * 结尾的匹配

  // 匹配以什么结尾的字符串，分别提取出这些字符串存放在endWith数组中
  endWith: function (list) {
    return list
      .filter(function (m) {
        return m.match(/^\*[^*]+$/);
      })
      .map(function (m) {
        return m.substr(1);
      });
  },
  // 以通配符 * 开头的匹配
  // ...........
  startWith: function (list) {
    return list
      .filter(function (m) {
        return m.match(/^[^*!]+\*$/);
      })
      .map(function (m) {
        return m.substr(0, m.length - 1);
      });
  },
  // 不含通配符的否定匹配
  // ..........
  notExact: function (list) {
    return list
      .filter(function (m) {
        return m.match(/^![^*].*$/);
      })
      .map(function (m) {
        return m.substr(1);
      });
  },
  // 不含通配符 * 的否定匹配
  // ..............
  notContain: function (list) {
    return list
      .filter(function (m) {
        return m.match(/^!\*.+\*$/);
      })
      .map(function (m) {
        return m.substr(2, m.length - 3);
      });
  },
  // 不以通配符 * 结尾的否定匹配
  // ..............
  notEndWith: function (list) {
    return list
      .filter(function (m) {
        return m.match(/^!\*[^*]+$/);
      })
      .map(function (m) {
        return m.substr(2);
      });
  },
  // 不以通配符 * 开头的否定匹配
  // ..............
  notStartWith: function (list) {
    return list
      .filter(function (m) {
        return m.match(/^![^*]+\*$/);
      })
      .map(function (m) {
        return m.substr(1, m.length - 2);
      });
  },
};

function createPropListMatcher(propList) {
  // matchaAll表示，匹配所有属性，也就是当前propList是 [*]
  const hasWild = propList.indexOf("*") > -1;
  const matchAll = hasWild && propList.length === 1;

  // 根据各种过滤条件创建属性列表匹配器
  // 根据propList的其他规则比如精确匹配，取反等，对propList里面的全部元素进行分类，比如把所有满足精确
  // 匹配属性拿出来
  // 下面lists对象的每一个属性都是数组类型，分别存放满足不同规则的属性，用于下面进一步对当前属性是否进行px to vw做判断
  const lists = {
    exact: filterPropList.exact(propList), // 存放propList中符合精确匹配的属性
    contain: filterPropList.contain(propList), //
    startWith: filterPropList.startWith(propList),
    endWith: filterPropList.endWith(propList),
    notExact: filterPropList.notExact(propList),
    notContain: filterPropList.notContain(propList),
    notStartWith: filterPropList.notStartWith(propList),
    notEndWith: filterPropList.notEndWith(propList),
  };
  /**
   * 最终返回一个闭包，对传入的属性根据propList列表里面的规则，来判断当前prop是否进行转换
   *
   */
  return function (prop) {
    if (matchAll) return true;
    return (
      (hasWild ||
        lists.exact.indexOf(prop) > -1 ||
        lists.contain.some(function (m) {
          return prop.indexOf(m) > -1;
        }) ||
        lists.startWith.some(function (m) {
          return prop.indexOf(m) === 0;
        }) ||
        lists.endWith.some(function (m) {
          return prop.indexOf(m) === prop.length - m.length;
        })) &&
      !(
        lists.notExact.indexOf(prop) > -1 ||
        lists.notContain.some(function (m) {
          return prop.indexOf(m) > -1;
        }) ||
        lists.notStartWith.some(function (m) {
          return prop.indexOf(m) === 0;
        }) ||
        lists.notEndWith.some(function (m) {
          return prop.indexOf(m) === prop.length - m.length;
        })
      )
    );
  };
}

module.exports = {
  filterPropList,
  createPropListMatcher,
};
