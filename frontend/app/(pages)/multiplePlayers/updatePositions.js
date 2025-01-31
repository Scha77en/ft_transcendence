"use client";
import { rightPaddle, leftPaddle, topPaddle, bottomPaddle, Ball  } from "../Components/GameFunctions";
import { GAME_CONSTANTS, scaling } from "./multiPlayerHelper";

const updateScores = (lastPlayer, setScores, setIsGameOver, setWinner, setEndModel) => {
  
  if (!lastPlayer ) return;
  
  setScores((prevScores) => {
    const newScores = { ...prevScores };
    newScores[lastPlayer]++;
    
    // Check for game over
    if (newScores[lastPlayer] === GAME_CONSTANTS.MAX_SCORE) {
      setIsGameOver(true);
      setWinner(lastPlayer);
      setEndModel(true);
    }

    return newScores;
  });
};

const checkCornerCollision = (ball, cornerSize) => {
  const buffer = GAME_CONSTANTS.BALL_RADIUS; // Add buffer for smoother detection
  
  // Top-left corner
  if (ball.x - buffer <= cornerSize && ball.y - buffer <= cornerSize) {
    return 'topLeft';
  }
  // Top-right corner
  if (ball.x + buffer >= GAME_CONSTANTS.ORIGINAL_WIDTH - cornerSize && ball.y - buffer <= cornerSize) {
    return 'topRight';
  }
  // Bottom-left corner
  if (ball.x - buffer <= cornerSize && ball.y + buffer >= GAME_CONSTANTS.ORIGINAL_HEIGHT - cornerSize) {
    return 'bottomLeft';
  }
  // Bottom-right corner
  if (ball.x + buffer >= GAME_CONSTANTS.ORIGINAL_WIDTH - cornerSize && 
      ball.y + buffer >= GAME_CONSTANTS.ORIGINAL_HEIGHT - cornerSize) {
    return 'bottomRight';
  }
  return null;
};

// Improved corner bounce handling with immediate position adjustment
const handleCornerBounce = (ball, corner) => { 
  const randomFactor = 0.3; 
  const maxRandom = 0.2; 
 
  switch(corner) {
    case 'topLeft':
      ball.vx = Math.abs(ball.vx) * (1 + Math.random() * randomFactor - maxRandom);
      ball.vy = Math.abs(ball.vy) * (1 + Math.random() * randomFactor - maxRandom);
      ball.x += GAME_CONSTANTS.BALL_RADIUS; 
      ball.y += GAME_CONSTANTS.BALL_RADIUS;
      break;
    case 'topRight':
      ball.vx = -Math.abs(ball.vx) * (1 + Math.random() * randomFactor - maxRandom);
      ball.vy = Math.abs(ball.vy) * (1 + Math.random() * randomFactor - maxRandom);
      ball.x -= GAME_CONSTANTS.BALL_RADIUS;
      ball.y += GAME_CONSTANTS.BALL_RADIUS;
      break;
    case 'bottomLeft':
      ball.vx = Math.abs(ball.vx) * (1 + Math.random() * randomFactor - maxRandom);
      ball.vy = -Math.abs(ball.vy) * (1 + Math.random() * randomFactor - maxRandom);
      ball.x += GAME_CONSTANTS.BALL_RADIUS;
      ball.y -= GAME_CONSTANTS.BALL_RADIUS;
      break;
    case 'bottomRight':
      ball.vx = -Math.abs(ball.vx) * (1 + Math.random() * randomFactor - maxRandom);
      ball.vy = -Math.abs(ball.vy) * (1 + Math.random() * randomFactor - maxRandom);
      ball.x -= GAME_CONSTANTS.BALL_RADIUS;
      ball.y -= GAME_CONSTANTS.BALL_RADIUS;
      break;
  }
  
  // Ensure minimum speed
  const minSpeed = GAME_CONSTANTS.INITIAL_BALL_SPEED;
  const newSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (newSpeed < minSpeed) {
    const scale = minSpeed / newSpeed;
    ball.vx *= scale;
    ball.vy *= scale;
  }
};

const checkCollision = (ball, paddle, isHorizontal = false) => {
  if (isHorizontal) {
    return (
      ball.x - GAME_CONSTANTS.BALL_RADIUS < paddle.x + paddle.width &&
      ball.x + GAME_CONSTANTS.BALL_RADIUS > paddle.x &&
      ball.y > paddle.y &&
      ball.y < paddle.y + paddle.height
    );
  }
  return (
    ball.x - GAME_CONSTANTS.BALL_RADIUS < paddle.x + paddle.width &&
    ball.x + GAME_CONSTANTS.BALL_RADIUS > paddle.x &&
    ball.y - GAME_CONSTANTS.BALL_RADIUS < paddle.y + paddle.height &&
    ball.y + GAME_CONSTANTS.BALL_RADIUS > paddle.y
  );
};

const resetBall = (direction, lastPlayerRef, scoreTimeoutRef, setScores, setIsGameOver, setWinner, setEndModel) => {
  // Update score before resetting
  const lastPlayer = lastPlayerRef.current;
  if (lastPlayer) {
    updateScores(lastPlayer, setScores, setIsGameOver, setWinner, setEndModel);
  }

  // Reset ball position and velocity
  Ball.x = GAME_CONSTANTS.ORIGINAL_WIDTH / 2;
  Ball.y = GAME_CONSTANTS.ORIGINAL_HEIGHT / 2;
  Ball.vx = GAME_CONSTANTS.INITIAL_BALL_SPEED * direction;
  Ball.vy = (Math.random() * 6 + 1) * (Math.random() < 0.5 ? -1 : 1);
  Ball.radius = GAME_CONSTANTS.BALL_RADIUS;

  // Reset last player after a short delay
  scoreTimeoutRef.current = setTimeout(() => {
    lastPlayerRef.current = null;
  }, 100);
};

export const update = (
  canvasRef,
  isGameOver,
  lastPlayerRef,
  scoreTimeoutRef,
  setScores,
  setIsGameOver,
  setWinner,
  setEndModel
) => {
  const canvas = canvasRef.current;
  if (!canvas || isGameOver) return;

  const { scaleX, scaleY } = scaling(0, 0, canvas);

  Ball.x += Ball.vx;
  Ball.y += Ball.vy;

  const cornerSize = 60;
  const cornerCollision = checkCornerCollision(Ball, cornerSize);
  if (cornerCollision) {
    handleCornerBounce(Ball, cornerCollision);
  }

  if (
    Ball.x - GAME_CONSTANTS.BALL_RADIUS <= GAME_CONSTANTS.WALL_WIDTH &&
    (Ball.y < GAME_CONSTANTS.VERTICAL_PLAYABLE_START ||
      Ball.y > GAME_CONSTANTS.VERTICAL_PLAYABLE_END)
  ) {
    Ball.x = GAME_CONSTANTS.WALL_WIDTH + GAME_CONSTANTS.BALL_RADIUS;
    Ball.vx = Math.abs(Ball.vx); 
  }

  if (
    Ball.x + GAME_CONSTANTS.BALL_RADIUS >=
      GAME_CONSTANTS.ORIGINAL_WIDTH - GAME_CONSTANTS.WALL_WIDTH &&
    (Ball.y < GAME_CONSTANTS.VERTICAL_PLAYABLE_START ||
      Ball.y > GAME_CONSTANTS.VERTICAL_PLAYABLE_END)
  ) {
    Ball.x =
      GAME_CONSTANTS.ORIGINAL_WIDTH -
      GAME_CONSTANTS.WALL_WIDTH -
      GAME_CONSTANTS.BALL_RADIUS;
    Ball.vx = -Math.abs(Ball.vx); 
  }

  if (
    Ball.y - GAME_CONSTANTS.BALL_RADIUS <= GAME_CONSTANTS.WALL_WIDTH &&
    (Ball.x < GAME_CONSTANTS.HORIZONTAL_PLAYABLE_START ||
      Ball.x > GAME_CONSTANTS.HORIZONTAL_PLAYABLE_END)
  ) {
    Ball.y = GAME_CONSTANTS.WALL_WIDTH + GAME_CONSTANTS.BALL_RADIUS;
    Ball.vy = Math.abs(Ball.vy); n
  }

  if (
    Ball.y + GAME_CONSTANTS.BALL_RADIUS >=
      GAME_CONSTANTS.ORIGINAL_HEIGHT - GAME_CONSTANTS.WALL_WIDTH &&
    (Ball.x < GAME_CONSTANTS.HORIZONTAL_PLAYABLE_START ||
      Ball.x > GAME_CONSTANTS.HORIZONTAL_PLAYABLE_END)
  ) {
    Ball.y =
      GAME_CONSTANTS.ORIGINAL_HEIGHT -
      GAME_CONSTANTS.WALL_WIDTH -
      GAME_CONSTANTS.BALL_RADIUS;
    Ball.vy = -Math.abs(Ball.vy); 
  }

  if (checkCollision(Ball, leftPaddle)) {
    if (scoreTimeoutRef.current) {
      clearTimeout(scoreTimeoutRef.current);
    }

    lastPlayerRef.current = "playerLeft";

    const hitLocation = (Ball.y - leftPaddle.y) / GAME_CONSTANTS.PADDLE_HEIGHT;

    let newSpeed = Math.abs(Ball.vx) * GAME_CONSTANTS.SPEED_FACTOR;
    newSpeed = Math.min(newSpeed, GAME_CONSTANTS.MAX_BALL_SPEED);
    newSpeed = Math.max(newSpeed, GAME_CONSTANTS.MIN_BALL_SPEED);

    Ball.vx = newSpeed;
    const angle = (hitLocation - 0.5) * 2;
    Ball.vy = angle * 8 + leftPaddle.dy * GAME_CONSTANTS.PADDLE_IMPACT;
  }
  if (checkCollision(Ball, rightPaddle)) {
    if (scoreTimeoutRef.current) {
      clearTimeout(scoreTimeoutRef.current);
    }

    lastPlayerRef.current = "playerRight";

    const hitLocation = (Ball.y - rightPaddle.y) / GAME_CONSTANTS.PADDLE_HEIGHT;

    let newSpeed = Math.abs(Ball.vx) * GAME_CONSTANTS.SPEED_FACTOR;
    newSpeed = Math.min(newSpeed, GAME_CONSTANTS.MAX_BALL_SPEED);
    newSpeed = Math.max(newSpeed, GAME_CONSTANTS.MIN_BALL_SPEED);

    Ball.vx = -newSpeed;
    const angle = (hitLocation - 0.5) * 2;
    Ball.vy = angle * 8 + rightPaddle.dy * GAME_CONSTANTS.PADDLE_IMPACT;
  }
  if (checkCollision(Ball, topPaddle, true)) {
    if (scoreTimeoutRef.current) {
      clearTimeout(scoreTimeoutRef.current);
    }

    lastPlayerRef.current = "playerTop";

    const hitLocation = (Ball.x - topPaddle.x) / GAME_CONSTANTS.PADDLE_WIDTH;

    let newSpeed = Math.abs(Ball.vy) * GAME_CONSTANTS.SPEED_FACTOR;
    newSpeed = Math.min(newSpeed, GAME_CONSTANTS.MAX_BALL_SPEED);
    newSpeed = Math.max(newSpeed, GAME_CONSTANTS.MIN_BALL_SPEED);

    Ball.vy = newSpeed;
    const angle = ((hitLocation - 0.5) * Math.PI) / 3;
    Ball.vx = Math.sin(angle) * newSpeed * 0.8 + topPaddle.dx * 0.3;
    const totalSpeed = Math.sqrt(Ball.vx * Ball.vx + Ball.vy * Ball.vy);
    if (totalSpeed > GAME_CONSTANTS.MAX_BALL_SPEED) {
      const scale = GAME_CONSTANTS.MAX_BALL_SPEED / totalSpeed;
      Ball.vx *= scale;
      Ball.vy *= scale;
    }
  }
  if (checkCollision(Ball, bottomPaddle, true)) {
    if (scoreTimeoutRef.current) {
      clearTimeout(scoreTimeoutRef.current);
    }

    lastPlayerRef.current = "playerBottom";

    const hitLocation = (Ball.x - bottomPaddle.x) / GAME_CONSTANTS.PADDLE_WIDTH;

    let newSpeed = Math.abs(Ball.vy) * GAME_CONSTANTS.SPEED_FACTOR;
    newSpeed = Math.min(newSpeed, GAME_CONSTANTS.MAX_BALL_SPEED);
    newSpeed = Math.max(newSpeed, GAME_CONSTANTS.MIN_BALL_SPEED);

    Ball.vy = -newSpeed;
    const angle = ((hitLocation - 0.5) * Math.PI) / 3;
    Ball.vx = Math.sin(angle) * newSpeed * 0.8 + bottomPaddle.dx * 0.3;
    const totalSpeed = Math.sqrt(Ball.vx * Ball.vx + Ball.vy * Ball.vy);
    if (totalSpeed > GAME_CONSTANTS.MAX_BALL_SPEED) {
      const scale = GAME_CONSTANTS.MAX_BALL_SPEED / totalSpeed;
      Ball.vx *= scale;
      Ball.vy *= scale;
    }
  }

  if (Ball.x < GAME_CONSTANTS.BALL_RADIUS) {
    resetBall(1, lastPlayerRef, scoreTimeoutRef, setScores, setIsGameOver, setWinner, setEndModel);
  }
  if (Ball.x > GAME_CONSTANTS.ORIGINAL_WIDTH - GAME_CONSTANTS.BALL_RADIUS) {
    resetBall(-1, lastPlayerRef, scoreTimeoutRef, setScores, setIsGameOver, setWinner, setEndModel);
  }
  if (Ball.y < GAME_CONSTANTS.BALL_RADIUS) {
    resetBall(1, lastPlayerRef, scoreTimeoutRef, setScores, setIsGameOver, setWinner, setEndModel);
  }
  if (Ball.y > GAME_CONSTANTS.ORIGINAL_HEIGHT - GAME_CONSTANTS.BALL_RADIUS) {
    resetBall(-1, lastPlayerRef, scoreTimeoutRef, setScores, setIsGameOver, setWinner, setEndModel);
  }

  leftPaddle.y += leftPaddle.dy / scaleY;
  rightPaddle.y += rightPaddle.dy / scaleY;
  topPaddle.x += topPaddle.dx / scaleX;
  bottomPaddle.x += bottomPaddle.dx / scaleX;

  leftPaddle.y = Math.max(
    0,
    Math.min(GAME_CONSTANTS.ORIGINAL_HEIGHT - leftPaddle.height, leftPaddle.y)
  );
  rightPaddle.y = Math.max(
    0,
    Math.min(GAME_CONSTANTS.ORIGINAL_HEIGHT - rightPaddle.height, rightPaddle.y)
  );
  topPaddle.x = Math.max(
    0,
    Math.min(GAME_CONSTANTS.ORIGINAL_WIDTH - topPaddle.width, topPaddle.x)
  );
  bottomPaddle.x = Math.max(
    0,
    Math.min(GAME_CONSTANTS.ORIGINAL_WIDTH - bottomPaddle.width, bottomPaddle.x)
  );
};