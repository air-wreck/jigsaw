/* jigsaw.js
 * Eric Zheng <ericzheng@cmu.edu>
 */

// The default objective function minimizes the total squared deviation
// from 1/4 height for each row (i.e. three 4:3 landscape photos per row
// is "ideal," ignoring margins).
function default_objective(rows) {
  const ideal_height = 0.25;
  return rows
    .map(row => Math.pow(row.height - ideal_height, 2))
    .reduce((x, y) => x + y);
}

// Slightly unorthodox: aspect ratios are height : width.
function make_row(aspect_ratios, margin) {
  if (aspect_ratios.length === 0)
    return [];

  const a1 = aspect_ratios[0];
  const coefficient_sum =
    aspect_ratios
      .map(a => a1 / a)
      .reduce((x, y) => x + y);

  const x1 = (1.0 - (aspect_ratios.length + 1) * margin) / coefficient_sum;
  return {
    'height': a1 * x1,
    'aspect_ratios': aspect_ratios,
    'widths': aspect_ratios.map(a => a1 * x1 / a)
  }
}

function* subsets(array) {
  const upper = 1 << array.length;
  for (let i = 0; i < upper; i++) {
    const str = i.toString(2).padStart(array.length);
    yield array.filter((_, idx) => str[idx] === '1');
  }
}

function* all_splits(items) {
  const all_indices = [...Array(items.length).keys()].slice(1);
  for (let indices of subsets(all_indices)) {
    const splits = [0, ...indices, items.length];
    yield splits.slice(1).map((hi, idx) => items.slice(splits[idx], hi));
  }
}

function layout(aspect_ratios, margin, objective = default_objective) {
  // For now, try each of the 2^(n-1) ways to split into rows.
  let best_rows = null;
  let best_value = -1;
  for (let split of all_splits(aspect_ratios)) {
    const rows = split.map(segment => make_row(segment, margin));
    const value = objective(rows);
    if (best_value < 0 || value < best_value) {
      best_rows = rows;
      best_value = value;
    }
  }

  return best_rows;
}

function draw(aspect_ratios, margin_abs, target) {
  layout(aspect_ratios, margin_abs / target.offsetWidth)
    .forEach(row => {
      row.widths
        .forEach((width, idx) => {
          const aspect_ratio = row.aspect_ratios[idx];
          const box = document.createElement('div');
          box.style.backgroundColor = 'red';
          width = width * target.offsetWidth;
          box.style.width = `${width}px`;
          box.style.height = `${width * aspect_ratio}px`;
          box.style.display = 'inline-block';
          box.style.margin = `${margin_abs / 2}px`;
          target.appendChild(box);
        });
    });
}
