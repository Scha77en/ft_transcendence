import { leftPaddle, rightPaddle,topPaddle, bottomPaddle, Ball } from "../Components/GameFunctions";
import { GAME_CONSTANTS, scaling } from "./multiPlayerHelper";
import { drawCorners } from "./DefaultMap";
import { dashedLine } from "./mapNum2";


export const mapNum4 = (context, canvas) => {
  const { scaleX, scaleY } = scaling(0, 0, canvas);

  const leftPaddleScreen = scaling(leftPaddle.x, leftPaddle.y, canvas);
  const rightPaddleScreen = scaling(rightPaddle.x, rightPaddle.y, canvas);


  context.strokeStyle = "#ffffff";
  context.lineWidth = 1;
  context.beginPath();
  context.rect(20, 30, canvas.width - 40, canvas.height - 60);
  context.stroke();

  dashedLine(
    context,
    canvas.width / 4,
    30,
    canvas.width / 4,
    canvas.height - 30,
    0,
    "#ffffff", 1
  );
  dashedLine(
    context,
    canvas.width - canvas.width / 4,
    30,
    canvas.width - canvas.width / 4,
    canvas.height - 30,
    0,
    "#ffffff", 1
  );

  // Draw leftPaddle
  context.fillStyle = "#BF9CFF";
  context.fillRect(
    leftPaddleScreen.x,
    leftPaddleScreen.y,
    GAME_CONSTANTS.PADDLE_WIDTH * scaleX,
    GAME_CONSTANTS.PADDLE_HEIGHT * scaleY
  );

  //Draw rightPaddle
  context.fillStyle = "#BF9CFF";
  context.fillRect(
    rightPaddleScreen.x,
    rightPaddleScreen.y,
    GAME_CONSTANTS.PADDLE_WIDTH * scaleX,
    GAME_CONSTANTS.PADDLE_HEIGHT * scaleY
  );
  
  //Draw topPaddle
  context.fillStyle = "#BF9CFF";
  context.fillRect(
    topPaddle.x * scaleX,
    topPaddle.y * scaleY,
    GAME_CONSTANTS.HORIZONTAL_PADDLE_WIDTH * scaleX,
    GAME_CONSTANTS.PADDLE_WIDTH * scaleY
  );
 

  // Draw bottomPaddle
  context.fillStyle = "#BF9CFF";
  context.fillRect(
    bottomPaddle.x * scaleX,
    bottomPaddle.y * scaleY,
    GAME_CONSTANTS.HORIZONTAL_PADDLE_WIDTH * scaleX,
    GAME_CONSTANTS.PADDLE_WIDTH * scaleY
  );

  // Draw ball
  context.beginPath();
  context.arc(
    Ball.x * scaleX,
    Ball.y * scaleY,
    GAME_CONSTANTS.BALL_RADIUS * Math.min(scaleX, scaleY),
    0,
    Math.PI * 2
  );
  context.fillStyle = "#ffffff";
  context.fill();

  drawCorners(context, canvas);

};
