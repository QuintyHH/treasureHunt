const fs = require('fs')
const pf = require('pathfinding')
const FILE_PATH = process.argv[2] // Here I am setting the filepath I need processed

const SUCCESS = 'success'
const FAIL = 'fail'
const CONSOLE_YELLOW = '\x1b[33m%s\x1b[0m'
const CONSOLE_RED = '\x1b[31m%s\x1b[0m'

const pipe = (...fns) => (value) => fns.reduce((value, fn) => fn(value), value)

const getFile = (filePath) => fs.readFileSync(filePath, 'UTF-8')

const extractFromArray = (arr) => arr[0]

const sanitizeFile = (file) =>
  file.split('\n').map((l) =>
    l
      .replace(/\s+/g, '')
      .split(',')
      .filter((l) => l.match(/(x\d+)(y\d+)/))
  )

const generateMatrix = (sanitized) =>
  sanitized.map((a) =>
    a.map((c) => ({
      x: +c.match(/x\d+/)[0].match(/\d+/)[0],
      y: +c.match(/y\d+/)[0].match(/\d+/)[0],
    }))
  )

const setStart = (matrix) => {
  const [start, ...rest] = matrix
  return { start, rest }
}

const setTreasure = ({ start, rest }) => {
  const [treasure, ...reef] = rest.reverse()
  return { start, treasure, reef }
}

const setCoordinates = (mapObject) => {
  const { start, reef, treasure } = mapObject
  return {
    ...mapObject,
    coordinates: [start[0], ...reef.flatMap((x) => x), treasure[0]],
  }
}

const setMapMax = (mapObject) => {
  const { coordinates, reef } = mapObject
  const xList = coordinates.map((x) => x.x)
  const yList = coordinates.map((y) => y.y)
  const maxX = Math.max(...xList) + 1
  const maxY = Math.max(...yList) + 1
  const reefList = reef.flatMap((r) => r)
  return { ...mapObject, reefList, maxX, maxY }
}

const buildGrid = (mapObject) => {
  const { start, treasure, reefList, maxX, maxY } = mapObject
  const startCoord = extractFromArray(start)
  const treasureCoord = extractFromArray(treasure)
  const grid = [...Array(maxY)].map((_, y) =>
    [...Array(maxX)].map((_, x) =>
      reefList.find((r) => x === r.x && y === r.y) ? 1 : 0
    )
  )
  return [startCoord, treasureCoord, grid]
}

const findPath = ([start, treasure, grid] = arr) => {
  const map = new pf.Grid(grid)
  const finder = new pf.AStarFinder({
    diagonalMovement: pf.DiagonalMovement.Never,
  })
  const path = finder.findPath(start.x, start.y, treasure.x, treasure.y, map)
  return { path, grid, start, treasure }
}

const formatMap = (mapObj) => {
  const { start, treasure, grid, path } = mapObj

  const map = grid.map((el, y) => {
    return el.map((val, x) => {
      if (x === start.x && y === start.y) return 'S'
      if (x === treasure.x && y === treasure.y) return 'E'
      if (val === 1) return 'X'
      if (val === 0)
        return path.some((el) => x === el[0] && y === el[1]) ? '0' : '.'
    })
  })
  return { path: path.length, map }
}

const renderMap = (map) => {
  console.clear()
  return console.table(map)
}

const renderNotification = (type = FAIL, path = false) =>
  type === SUCCESS
    ? path
      ? console.log(CONSOLE_YELLOW, 'Treasure was found! Argghhh matey!')
      : console.log(CONSOLE_RED, 'No treasure here! Back to the ship!')
    : console.log(CONSOLE_RED, 'Treasure map could not be deciphered!')

const main = (file) => {
  try {
    // This is our drawn map with S as start E as treasure X for reef and . for spaces where we can navigate. 0 is marking the found path
    const treasureMap = pipe(
      getFile, // Here I read the file that I needed
      sanitizeFile, // Here I make sure the file contents are compatible with the required format
      generateMatrix, // Here I build the map matrix
      setStart, // Here I set the start position
      setTreasure, // Here I set the treasure position
      setCoordinates, // Here I prepare the coordinates to be able to set minMax on axis
      setMapMax, // Here I set the maps' max coordinates
      buildGrid, // And finally, I build a grid as an array of arrays based on max lengths
      findPath, // Here I use the pathfinding lib to apply A* algorithm
      formatMap // Here I transform the map to match requirements
    )(file)

    const { map, path } = treasureMap
    renderMap(map)
    renderNotification(SUCCESS, path)
  } catch (err) {
    renderNotification(FAIL)
  }
}

main(FILE_PATH)
