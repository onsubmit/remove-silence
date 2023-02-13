const positions = ["start", "end"] as const;
export type TimestampPosition = (typeof positions)[number];

export type Timestamp = {
  position: TimestampPosition;
  value: number;
};

export function isTimestampPosition(arg: string): arg is TimestampPosition {
  return positions.some((v) => v === arg);
}
