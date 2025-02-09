import {
  Bodies,
  Body,
  Composite,
  Engine,
  Events,
  IEventCollision,
  Render,
  Runner,
  World
} from 'matter-js'
import { useCallback, useEffect, useState } from 'react'
import { random } from '../utils/random'
import { MultiplierHistory } from '../components/multiplierHistory';
import Matter from 'matter-js';
import { COLORS } from '../constants/colors';
import { BALL, ENGINE, LINES, PINS, WORLD } from '../constants/config';
import { multipliers } from '../stores/store';
import { Multiplier } from '../types';

export default function Game () {
  const engine = Engine.create()
  const [lastMultipliers, setLastMultipliers] = useState<number[]>([])
  const [lines, _setLines] = useState<number>(LINES)
  const worldWidth: number = WORLD.width
  const worldHeight: number = WORLD.height

  useEffect(() => {
    engine.gravity.y = ENGINE.engineGravity
    const element = document.getElementById('plinko')
    const render = Render.create({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      element: element!,
      bounds: {
        max: {
          y: worldHeight,
          x: worldWidth 
        },
        min: {
          y: 0,
          x: 0
        }
      },
      options: {
        background: COLORS.backgrond,
        hasBounds: true,
        width: worldWidth * 2,
        height: worldHeight * 1.5,
        wireframes: false
      },
      engine
    })
    const runner = Runner.create()
    Runner.run(runner, engine)
    Render.run(render)
    return () => {
      World.clear(engine.world, true)
      Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [lines])

  const pins: Body[] = []

  for (let l = 0; l < lines; l++) {
    const linePins = PINS.startPins + l
    const lineWidth = linePins * PINS.pinGap
    for (let i = 0; i < linePins; i++) {
      const pinX =
        worldWidth / 2 -
        lineWidth / 2 +
        i * PINS.pinGap +
        PINS.pinGap / 2

      const pinY =
        worldWidth / lines + l * PINS.pinGap + PINS.pinGap

      const pin = Bodies.circle(pinX, pinY, PINS.pinSize, {
        label: `pin-${i}`,
        render: {
          fillStyle: COLORS.pin
        },
        isStatic: true
      })
      pins.push(pin)
    }
  }



  const addBall = useCallback(
    () => {
      const minBallX =
        worldWidth / 2 - PINS.pinSize * 3 + PINS.pinGap
      const maxBallX =
        worldWidth / 2 -
        PINS.pinSize * 3 -
        PINS.pinGap +
        PINS.pinGap / 2

      const ballX = random(minBallX, maxBallX)
      const ballColor = COLORS.ball
      const ball = Bodies.circle(ballX, 20, BALL.ballSize, {
        restitution: 1,
        friction: 0.6,
        label: `ball-1`,
        id: new Date().getTime(),
        frictionAir: 0.05,
        collisionFilter: {
          group: -1
        },
        render: {
          fillStyle: ballColor
        },
        isStatic: false
      })
      Composite.add(engine.world, ball)
    },
    [lines]
  )

  const leftWall = Bodies.rectangle(
    worldWidth / 3 - PINS.pinSize * PINS.pinGap - PINS.pinGap,
    worldWidth / 2 - PINS.pinSize,
    worldWidth * 2,
    40,
    {
      angle: 90,
      render: {
        visible: false
      },
      isStatic: true
    }
  )
  const rightWall = Bodies.rectangle(
    worldWidth -
    PINS.pinSize * PINS.pinGap -
    PINS.pinGap -
    PINS.pinGap / 2,
    worldWidth / 2 - PINS.pinSize,
    worldWidth * 2,
    40,
    {
      angle: -90,
      render: {
        visible: false
      },
      isStatic: true
    }
  )
  const floor = Bodies.rectangle(0, worldWidth + 10, worldWidth * 10, 40, {
    label: 'block-1',
    render: {
      visible: false
    },
    isStatic: true
  })



  const multipliersBodies: Body[] = []

  let lastMultiplierX: number =
    worldWidth / 2 - (PINS.pinGap / 2) * lines - PINS.pinGap

    

  multipliers.forEach((multiplier: Multiplier) => {
    const blockSize = 20 
    const multiplierBody = Bodies.rectangle(
      lastMultiplierX + 20,
      worldWidth / lines + lines * PINS.pinGap + PINS.pinGap,
      blockSize,
      blockSize,
      {
        label: multiplier.label,
        isStatic: true,
        render: {
          sprite: {
            xScale: 0.4,
            yScale: 0.4,
            texture: multiplier.img
          }
        }
      }
    )
    lastMultiplierX = multiplierBody.position.x
    multipliersBodies.push(multiplierBody)
  })

  Composite.add(engine.world, [
    ...pins,
    ...multipliersBodies,
    leftWall,
    rightWall,
    floor
  ])

  function bet() {
    addBall()
  }

  async function onCollideWithMultiplier(ball: Body, multiplier: Body) {
    ball.collisionFilter.group = 2
    World.remove(engine.world, ball)
    // const ballValue = ball.label.split('-')[1]
    const multiplierValue = +multiplier.label.split('-')[1] 
    setLastMultipliers(prev => [multiplierValue, prev[0], prev[1], prev[2]])
  }

  const multiplierAnimation = (ball: Body) => {
    const multiplierBody = ball;
    const originalY = multiplierBody.position.y;
    const newY = originalY + 10; 
    const duration = 200;
    const easing = 'ease-out';
    const startTime = Date.now();
    let isDown = true;

    function update() {
      const currentTime = Date.now();
      const progress = (currentTime - startTime) / duration;
      const easedProgress = easing === 'ease-out' ? 1 - Math.pow(1 - progress, 3) : progress;
      const newYPosition = originalY + (newY - originalY) * easedProgress;

      if (isDown) {
        if (progress < 0.5) {
          Matter.Body.translate(multiplierBody, { x: 0, y: (newYPosition - multiplierBody.position.y) / 10 });
        } else {
          isDown = false;
        }
      } else {
        if (multiplierBody.position.y > originalY) {
          Matter.Body.translate(multiplierBody, { x: 0, y: originalY - multiplierBody.position.y });
        }
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    update();
  }

  async function onBallHitPin(pin: Body) {
    const pinBody = pin;
    const newColor = COLORS.hitPin; 
    const duration = 200;
    pinBody.render.fillStyle = newColor;

    setTimeout(() => {
      pinBody.render.fillStyle = COLORS.pin;
    }, duration);
  }

  async function onBodyCollision(event: IEventCollision<Engine>) {
    const pairs = event.pairs
    for (const pair of pairs) {
      const { bodyA, bodyB } = pair
      if (bodyB.label.includes('ball') && bodyA.label.includes('block')) {
        await onCollideWithMultiplier(bodyB, bodyA)
        multiplierAnimation(bodyA)
      }
      if (bodyB.label.includes('ball') && bodyA.label.includes('pin')) {        
        onBallHitPin(bodyA);
      }
    }
  }
  
  Events.on(engine, 'collisionActive', onBodyCollision)
  
  return (
    <div className='plinko-container'>
      <div id="plinko" />
      <button onClick={() => bet()}>PLAY</button>
      <MultiplierHistory multiplierHistory={lastMultipliers} />
    </div>
  )
}
