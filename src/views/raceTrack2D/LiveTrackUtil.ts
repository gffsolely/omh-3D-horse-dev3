export class NumTag {
  public name: string;
  public x: number;
  public y: number;
  public radius: number;
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
