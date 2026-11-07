(() => {
  'use strict';

  if (typeof console === 'undefined' || typeof console.log !== 'function') return;

  // One square grid, with each mark fitted in its original proportions.
  // Font-relative line height keeps half-block cells in proportion.
  const mark = [
    "                    ",
    "         ▄▄██       ",
    "     ▄▄██████       ",
    "   ▄██████▀  ▄▄▄    ",
    "   █████▀ ▄█████    ",
    "   █████  ██████    ",
    "   █████  ██████    ",
    "   ▀█████▄ ▀███▀    ",
    "     ▀▀▀▀   █▀      ",
    "                    "
  ].join('\n');
  const font = 'Menlo, Consolas, "Liberation Mono", monospace';
  const markStyle = 'font:12px/2ch ' + font +
    ';color:#C4AF79;background:#0b0c0f;margin-left:calc((182px + 7.5ch - 20ch)/2);';
  const labelStyle = 'font:600 11px/22px ' + font + ';color:#7f8792;';
  const valueStyle = 'font:500 15px/26px ' + font + ';color:inherit;';

  // One message per page load; the contact values remain easy to copy.
  console.log(
    '%c' + mark + '%c\n\n%cEMAIL  %cWECHAT\n%cq1d40@qq.com  %cQ1-D40',
    markStyle,
    '',
    labelStyle + 'padding-right:calc(182px - 7ch);',
    labelStyle,
    valueStyle + 'padding-right:calc(182px - 14ch);',
    valueStyle
  );
})();
