export const colors = {
  bg:        '#0a0a0f',
  card:      '#0d1117',
  border:    '#21262d',
  text:      '#e6edf3',
  textMuted: '#8b949e',
  primary:   '#0072ff',
  success:   '#3fb950',
  danger:    '#f85149',
  warning:   '#d29922',
};

export const fonts = {
  xs:  11,
  sm:  13,
  md:  15,
  lg:  17,
  xl:  20,
  xxl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export function gradeColor(grade) {
  if (grade === 'A') return '#ffd200';
  if (grade === 'B') return '#3fb950';
  return '#8b949e';
}
