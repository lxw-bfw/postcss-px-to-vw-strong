import postcss from 'postcss'
import fs from 'fs'
import path from 'path'
import postcssPxToViewport from '../dist'
import { CustomUnit, OptionType } from '../dist/types/index'

const css = fs.readFileSync(path.resolve(__dirname, './index.css'), 'utf8')

const customUnit: CustomUnit = {
  name: 'nx', // 单位名称
  realUnit: 'em',
  isOPenToViewPort: false, // 是否开启px到视口单位的转换
  joinString: '!important', // 转换后是拼接的额外字符串，比如'!important'
  behavior: (originSize) => {
    const handleValue = originSize * 2
    return `${handleValue}`
  },
}

const pxToViewportOpts: OptionType = {
  viewportWidth: 320,
  landscape: true,
  customUnit,
}

const processedCss = postcss(postcssPxToViewport(pxToViewportOpts)).process(css, {
  from: path.resolve(__dirname, './index.css'),
}).css

fs.writeFile(path.resolve(__dirname, './index-viewport.css'), processedCss, function (err) {
  if (err) {
    throw err
  }
  console.log('File with viewport units written.')
})
