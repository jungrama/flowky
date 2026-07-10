import avatarUrl from "../assets/avatar.svg";

/** The avatar.svg is a 4×4 sprite sheet of emotion faces. */
const SHEET_W = 646;
const SHEET_H = 576;
const COLS = 4;
const ROWS = 4;

export type Emotion =
  | "neutral"
  | "happy"
  | "content"
  | "surprised"
  | "laughing"
  | "sad"
  | "annoyed"
  | "sideEye";

// [col, row] into the 4×4 grid (0-indexed, left→right / top→bottom).
const CELL: Record<Emotion, [number, number]> = {
  neutral: [0, 0],
  happy: [1, 0],
  sad: [0, 1],
  content: [1, 1],
  surprised: [2, 1],
  laughing: [3, 1],
  annoyed: [3, 2],
  sideEye: [3, 3],
};

interface AvatarFaceProps {
  emotion: Emotion;
  /** Display width in px; height keeps the cell aspect ratio. */
  size?: number;
  className?: string;
}

export default function AvatarFace({
  emotion,
  size = 76,
  className,
}: AvatarFaceProps) {
  const [col, row] = CELL[emotion];
  const cellW = SHEET_W / COLS;
  const cellH = SHEET_H / ROWS;
  const w = size;
  const h = (size * cellH) / cellW;

  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: `${w}px`,
        height: `${h}px`,
        backgroundImage: `url(${avatarUrl})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${w * COLS}px ${h * ROWS}px`,
        backgroundPosition: `-${col * w}px -${row * h}px`,
      }}
    />
  );
}
