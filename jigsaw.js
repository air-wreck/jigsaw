/* jigsaw.js
 * Eric Zheng <ericzheng@cmu.edu>
 */

const Jigsaw = (function() {

  // The "ideal height" for a row is by default 1/4 (i.e. three 4:3
  // landscape photos per row, ignoring margins). This only affects the
  // provided objective functions; you can write your own instead.
  const default_ideal_height = 0.25;

  // Mnimize the total squared deviation from ideal height.
  function objective_squared_error(height,
    ideal_height = default_ideal_height) {

    return Math.pow(height - ideal_height, 2);
  }

  // A more sophisticated objective tries to heavily penalize very small
  // rows.
  function objective_penalize_small(height,
    ideal_height = default_ideal_height) {

    if (height < ideal_height)
      return Math.log(ideal_height / height);
    return height - ideal_height;
  }

  const default_objectives = {
    squared_error: objective_squared_error,
    penalize_small: objective_penalize_small
  }

  // Returns the scale factors for the images, in the same order as
  // provided in aspect_ratios.
  function scale_images(aspect_ratios, margin, objective) {
    let sum = 0;
    const prefix_sums = aspect_ratios.map(a => sum += a);

    function compute_height(i, j) {
      let range_sum = prefix_sums[j];
      if (i > 0)
        range_sum -= prefix_sums[i - 1];

      const n = j - i + 1;
      return (1 - (n + 1) * margin) / range_sum;
    }

    // Dynamic programming approach costs O(n^2).
    // Note that we minimize the *mean* error across all rows, not the
    // *total* error. Otherwise, we would artificially prefer having
    // just one really small row.
    const solution = Array(aspect_ratios.length);
    for (let i = 0; i < aspect_ratios.length; i++) {
      let best_height = compute_height(0, i);
      let best_cost = objective(best_height);
      let best_prev = null;
      let best_n = 1;
      for (let j = 0; j < i; j++) {
        const height = compute_height(j + 1, i);
        const cost = (solution[j].cost * solution[j].n + objective(height))
                     / (solution[j].n + 1);
        if (cost < best_cost) {
          best_height = height;
          best_cost = cost;
          best_prev = j;
          best_n = solution[j].n + 1;
        }
      }
      solution[i] = {
        prev: best_prev,
        cost: best_cost,
        height: best_height,
        n : best_n
      };
    }

    // Compute each image height by walking backward in the solution
    // array.
    const heights = Array(aspect_ratios.length);
    let idx = aspect_ratios.length - 1;
    do {
      heights[idx] = solution[idx].height;
      idx = solution[idx].prev;
    } while (idx !== null);

    for (idx = aspect_ratios.length - 2; idx >= 0; idx--) {
      if (heights[idx] === undefined)
        heights[idx] = heights[idx + 1];
    }

    // Compute scale factors from heights.
    return heights.map((height, idx) => height * aspect_ratios[idx]);
  }

  function draw(aspect_ratios, margin_abs, target,
    objective = default_objectives.squared_error) {

    target.style.paddingTop = `${margin_abs / 2}px`;
    target.style.paddingBottom = `${margin_abs / 2}px`;
    scale_images(aspect_ratios,
                 margin_abs / target.offsetWidth,
                 objective = objective)
      .forEach((scale, idx) => {
        const width = scale * target.offsetWidth;
        const aspect_ratio = aspect_ratios[idx];
        const box = document.createElement('div');
        box.style.backgroundColor = 'palevioletred';
        box.style.width = `${width}px`;
        box.style.height = `${width / aspect_ratio}px`;
        box.style.display = 'inline-block';
        box.style.margin = `${margin_abs / 2}px`;
        box.style.lineHeight = '1em';
        box.style.textAlign = 'left';
        box.textContent = aspect_ratio.toFixed(2);
        target.appendChild(box);
      });
  }

  function layout(images, target_width, margin_abs = 5,
    objective = default_objectives.squared_error) {

    const aspect_ratios = Array.from(images)
      .map(image => image.naturalWidth / image.naturalHeight);

    scale_images(aspect_ratios,
                 margin_abs / target_width,
                 objective = objective)
      .forEach((scale, idx) => {
        const image = images[idx];
        image.width = scale * target_width;
        image.style.margin = `${0.5 * margin_abs}px`;
      });
  }

  return {
    scale_images: scale_images,
    draw: draw,
    layout: layout,
    default_objectives: default_objectives
  }
})();
