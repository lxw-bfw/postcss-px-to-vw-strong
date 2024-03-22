interface CustomUnit {
  name: string; //自定义单位名称
  realUnit: string; // 不开启转换，最终替换的真正单位，比如rem、en、px，默认采用px
  isOPenToViewPort: boolean; // 自定义单位是否开启到视口单位的转换
  joinString: string; //转换后是拼接的额外字符串，比如'!important'
  behavior: (originSize: number) => {
    handleValue?: number;
  };
}
