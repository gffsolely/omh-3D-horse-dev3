export class NumTag {
  public name: string;
  public x: number;
  public y: number;
  public radius: number;
  public sideWidth: number;
  public color: string;
  public txt: string;

  constructor(x: number, y: number, radius: number, color: string, txt: string) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.txt = txt;
    this.name = 'number' + txt;
  }

  draw2(ctx: CanvasRenderingContext2D, x = 0, y = 0) {
    this.x = x;
    this.y = y;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = 'white';
    ctx.font = this.radius * 1.5 + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.txt, this.x, this.y + this.radius / 6); //this.y + this.radius / 6 //绘制数字时尽量达到垂直居中
  }
}

const pir = (x, y, w, d) => {
  const x1 = w * Math.cos(d + Math.PI / 4) + x;
  const y1 = w * Math.sin(d + Math.PI / 4) + y;
  //console.log('pir :', JSON.stringify({ x, y, r, d, x1, y1 }));
  return [x1, y1];
};

export class NumTagSquare {
  private name: string;
  private boxWidth: number;
  private lineWidth: number;
  private color: string;
  private txt: string;
  private ctx: CanvasRenderingContext2D;

  /**  */
  constructor(ctx: CanvasRenderingContext2D, color: string, w: number, lineW: number, txt = '') {
    this.ctx = ctx;
    this.boxWidth = w;
    this.lineWidth = lineW;
    this.color = color;
    this.txt = txt;
    this.name = 'number' + txt;
  }

  drawBox(x = 0, y = 0, r = 0) {
    //console.log('drawBox:', { ctx, x, y, r });
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.lineWidth = 1;
    let pb = pir(x, y, this.boxWidth, r);
    ctx.moveTo(pb[0], pb[1]);
    for (let i = 0; i <= 3; i++) {
      const deg = i * (Math.PI / 2) + r;
      pb = pir(x, y, this.boxWidth, deg);
      ctx.lineTo(pb[0], pb[1]);
    }
    ctx.closePath();
    ctx.fillStyle = '#3AFF4E'; //this.color;
    ctx.fill();
  }
  drawLine(x = 0, y = 0, x2 = 0, y2 = 0) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.strokeStyle = '#3AFF4E33'; //'blue';
    //ctx.strokeStyle = 'blue';
    ctx.lineWidth = this.lineWidth;
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
  }

  /**
   * 画弯道
   * @param ctx
   * @param x 圆心坐标x
   * @param y 圆心坐标y
   * @param radius 圆半径
   * @param r1 角度1
   * @param r2 角度2
   */
  drawCurve(x = 0, y = 0, radius = 0, r1 = 0, r2 = 0) {
    //console.log('drawCurve param :', { x, y, radius, r1, r2 });

    const sAngle = -(r2 - 3.14159 / 2);
    const eAngle = -(r1 - 3.14159 / 2);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.strokeStyle = '#3AFF4E33'; //'blue';
    ctx.lineWidth = this.lineWidth;
    ctx.arc(x, y, radius, sAngle, eAngle);
    ctx.stroke();
    ctx.closePath();
  }
}

// export class NumTagSquare {
//   public name: string;
//   public x: number;
//   public y: number;
//   public sideWidth: number;
//   public sideHeight: number;
//   public color: string;
//   public txt: string;
//   private canvasWidth: number;
//   private canvasHeight: number;
//   private ctx: CanvasRenderingContext2D;

//   /**  */
//   constructor(
//     ctx: CanvasRenderingContext2D,
//     x: number,
//     y: number,
//     color: string,
//     w: number,
//     canvasW: number,
//     canvasH: number,
//     h = w,
//     txt = ''
//   ) {
//     this.ctx = ctx;
//     this.x = x;
//     this.y = y;
//     this.sideWidth = w;
//     this.sideHeight = h;
//     this.color = color;
//     this.txt = txt;
//     this.name = 'number' + txt;
//     this.canvasWidth = canvasW;
//     this.canvasHeight = canvasH;
//   }

//   draw2(ctx: CanvasRenderingContext2D, x = 0, y = 0, r = 0) {
//     //console.log('draw2:', { ctx, x, y, r });
//     // this.x = x;
//     // this.y = y;
//     ctx.fillStyle = this.color;
//     ctx.fillRect(x, y, this.sideWidth, this.sideHeight);
//   }
//   drawLine(x = 0, y = 0, x2 = 0, y2 = 0) {
//     const ctx = this.ctx;
//     ctx.beginPath();
//     //设置线条颜色为蓝色
//     ctx.strokeStyle = 'blue';
//     ctx.lineWidth = 10;
//     ctx.moveTo(x, y);
//     ctx.lineTo(x2, y2);
//     ctx.stroke();
//     //关闭绘制路径
//     ctx.closePath();
//   }

//   // draw4(ctx: CanvasRenderingContext2D, x = 0, y = 0, x2 = 0, y2 = 0) {
//   //   console.log('draw4:', { x, y, x2, y2 });
//   //   ctx.beginPath();
//   //   //设置线条颜色为蓝色
//   //   ctx.strokeStyle = 'blue';
//   //   ctx.lineWidth = 10;
//   //   ctx.moveTo(x, y);
//   //   const pOffset = 20;
//   //   // 使用bezierCurveTo方法连接点

//   //   // ctx.bezierCurveTo(x + pOffset, y - pOffset, x2 - pOffset, y2 - pOffset, x2, y2);
//   //   ctx.arcTo(x + 1, y + 1, x2, y2, 100);
//   //   ctx.stroke();
//   //   //关闭绘制路径
//   //   ctx.closePath();
//   // }
//   /**
//    * 画弯道
//    * @param ctx
//    * @param x 圆心坐标x
//    * @param y 圆心坐标y
//    * @param radius 圆半径
//    * @param r1 角度1
//    * @param r2 角度2
//    */
//   drawCurve(x = 0, y = 0, radius = 0, r1 = 0, r2 = 0) {
//     //console.log('drawCurve param :', { x, y, radius, r1, r2 });
//     // let sAngle = -r1 / 2 - (r2 - r1);
//     // let eAngle = -r1 / 2;
//     // if (r2 >= 6.31917) {
//     //   sAngle = -r2 - 3.14159 / 2;
//     //   eAngle = -r1 - 3.14159 / 2;
//     //   console.log('drawCurve:', { sAngle, eAngle, r1, r2 });
//     // }

//     const sAngle = -(r2 - 3.14159 / 2);
//     const eAngle = -(r1 - 3.14159 / 2);

//     const ctx = this.ctx;
//     ctx.beginPath();
//     ctx.strokeStyle = 'blue';
//     ctx.lineWidth = 10;
//     ctx.arc(x, y, radius, sAngle, eAngle);
//     ctx.stroke();
//     ctx.closePath();
//   }
// }
