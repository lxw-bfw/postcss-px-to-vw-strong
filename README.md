## 项目说明

- `postcss`插件`ts`开发环境和项目模板搭建
  - 支持ts
  - 代码格式、语法质量和统一保证
  - 支持单元测试
  - `husky`和`lint-stage`集成自动代码格式、语法修复和自动单元测试
  - ...
  - js迁移ts
- `postcss-px-to-vw-strong`插件开发

## 功能说明

### 保留`postcss-pixel-to-viewport`插件原有的全部功能

[postcss-pixel-to-viewport](https://evrone.com/blog/postcss-px-viewport) 

### 扩展自定义单位功能

#### 功能概述

> **支持个性化定制单位**
>
> - **定制一个新的单位名称如 `nx`**
>
> - **可以配置使用这个单位时的行为**
>   - 是否开启转换`vw`，默认开启，如果关闭的话，使用此单位，默认返回`px`，实现更细节的控制`px`到视口单位的转换
>   - 个性化返回，可以使用一个函数，来控制使用此单位的时候，返回的什么内容，覆盖原来的尺寸，比如给每个尺寸都加上`2px`。如果没有关闭`vw`转换，那么会使用`behavior`重新计算后的值来换算为`vw`返回
>   - `css`属性末尾追加内容，可以定义在转换后的新的`css`属性值追加一些字符串
>   - 配置真实的替换单位，替换自定义单位。

#### list

- 支持在`css`中使用自定义的单位；
- 对自定义单位不配置其他属性的话，默认开启进行视口转换，会按照视口转换的相关配置进行转换后代替；
- 自定义单位可以单独配置是否开启视口转换，实现更灵活的视口转换开关；
- 不开启视口转换的话，自定义单位默认转换为`px`，可以配置其他真实的转换单位替换`px`，比如`em`
- 支持传递`behavior`函数，来接收每一个自定义单位的原始值，对其进行二次操作，二次操作后的值会继续输入插件进行处理
- 支持传递`joinString`属性，可以定义在转换后的新的`css`属性值追加一些字符串

## 安装和使用

### 安装

```bash
npm i postcss-px-to-vw-strong
or
yarn add postcss-px-to-vw-strong
```

### 使用

#### `postcss.config.ts`

```typescript
import postcssPxToViewport from 'postcss-px-to-vw-strong'
import { CustomUnit } from 'postcss-px-to-vw-strong/dist/types/index'

const customUnit: CustomUnit = {
  name: 'nx', // 自定义单位名称
  realUnit: 'em',// 关闭视口转换后，使用代替的真实单位，默认px
  isOPenToViewPort: false, // 是否开启px到视口单位的转换，默认true
  behavior: (originSize) => { // 定义对原始值的操作
    const handleValue = originSize * 2
    return `${handleValue}`
  }
}

export default {
  plugins: {
    'postcssPxToViewport': {customUnit},
  },
};

```

#### `postcss.config.js`

```js
const postcss  = reqiuer('postcss')
const postcssPxToViewport = reqiuer('postcss-px-to-vw-strong')


const customUnit = {
  name: 'nx', // 自定义单位名称
  realUnit: 'em',// 关闭视口转换后，使用代替的真实单位，默认px
  isOPenToViewPort: false, // 是否开启px到视口单位的转换，默认true
  behavior: (originSize) => { // 定义对原始值的操作
    const handleValue = originSize * 2
    return `${handleValue}`
  }
}

module.exports = {
  plugins: {
    'postcssPxToViewport': {customUnit},
  },
};
```







