const chunk = <T>(arr: T[], size: number): T[][] => {
  const length = Math.ceil(arr.length / size);
  const chunked = Array.from({ length }, (_, i: number) => arr.slice(i * size, i * size + size));
  return chunked;
};

export { chunk };
