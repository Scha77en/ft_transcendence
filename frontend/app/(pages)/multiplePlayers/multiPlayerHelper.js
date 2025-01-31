import { leftPaddle, rightPaddle,topPaddle, bottomPaddle, fil, Ball } from "../Components/GameFunctions";

export const GAME_CONSTANTS = {
  ORIGINAL_WIDTH: 800,
  ORIGINAL_HEIGHT: 810, 
  
  PADDLE_HEIGHT: 90,
  PADDLE_WIDTH: 17,
  
  HORIZONTAL_PADDLE_WIDTH: 90, 
  
  MIN_PADDLE_WIDTH: 12,
  BALL_RADIUS: 10,
  OFFSET_X: 0,
  OFFSET_Y: 0, 
  MAX_SCORE: 5,
  INITIAL_BALL_SPEED: 4,
  MAX_BALL_SPEED: 10,
  MIN_BALL_SPEED: 5,
  SPEED_FACTOR: 1.08,
  PADDLE_IMPACT: 0.2,
};

export const scaling = (gameX, gameY, canvas) => {
  const scaleX = canvas.width / GAME_CONSTANTS.ORIGINAL_WIDTH;
  const scaleY = canvas.height / GAME_CONSTANTS.ORIGINAL_HEIGHT;

  return {
    x: gameX * scaleX,
    y: gameY * scaleY,
    scaleX,
    scaleY,
  };
};

export const initialCanvas = (divRef, canvas) => {
  // Make canvas square
  const container = divRef.current;
  const containerSize = Math.min(container.clientWidth * 0.7, window.innerHeight * 0.7);
  
  canvas.width = containerSize;
  canvas.height = containerSize;

  // Initialize vertical paddles (left and right)
  leftPaddle.x = GAME_CONSTANTS.OFFSET_X;
  leftPaddle.y = GAME_CONSTANTS.ORIGINAL_HEIGHT / 2 - GAME_CONSTANTS.PADDLE_HEIGHT / 2;
  leftPaddle.width = GAME_CONSTANTS.PADDLE_WIDTH;
  leftPaddle.height = GAME_CONSTANTS.PADDLE_HEIGHT;

  rightPaddle.x = GAME_CONSTANTS.ORIGINAL_WIDTH - GAME_CONSTANTS.PADDLE_WIDTH - GAME_CONSTANTS.OFFSET_X;
  rightPaddle.y = GAME_CONSTANTS.ORIGINAL_HEIGHT / 2 - GAME_CONSTANTS.PADDLE_HEIGHT / 2;
  rightPaddle.width = GAME_CONSTANTS.PADDLE_WIDTH;
  rightPaddle.height = GAME_CONSTANTS.PADDLE_HEIGHT;

  // Initialize horizontal paddles (top and bottom)
  topPaddle.x = GAME_CONSTANTS.ORIGINAL_WIDTH / 2 - GAME_CONSTANTS.HORIZONTAL_PADDLE_WIDTH / 2;
  topPaddle.y = GAME_CONSTANTS.OFFSET_Y;
  topPaddle.width = GAME_CONSTANTS.HORIZONTAL_PADDLE_WIDTH;
  topPaddle.height = GAME_CONSTANTS.PADDLE_WIDTH;

  bottomPaddle.x = GAME_CONSTANTS.ORIGINAL_WIDTH / 2 - GAME_CONSTANTS.HORIZONTAL_PADDLE_WIDTH / 2;
  bottomPaddle.y = GAME_CONSTANTS.ORIGINAL_HEIGHT - GAME_CONSTANTS.PADDLE_WIDTH - GAME_CONSTANTS.OFFSET_Y;
  bottomPaddle.width = GAME_CONSTANTS.HORIZONTAL_PADDLE_WIDTH;
  bottomPaddle.height = GAME_CONSTANTS.PADDLE_WIDTH;

  // Initialize ball in center
  Ball.x = GAME_CONSTANTS.ORIGINAL_WIDTH / 2;
  Ball.y = GAME_CONSTANTS.ORIGINAL_HEIGHT / 2;
  Ball.radius = GAME_CONSTANTS.BALL_RADIUS;
  Ball.vx = GAME_CONSTANTS.INITIAL_BALL_SPEED;
  Ball.vy = (Math.random() * 6 + 1) * (Math.random() < 0.5 ? -1 : 1);
};