(() => {
  'use strict';

  if (typeof console === 'undefined' || typeof console.log !== 'function') return;

  const mark = "           ▄███▄    \n       ▄▄███████    \n   ▄▄███████████    \n ▄██████████▀▀    ▄ \n█████████▀▀   ▄▄████\n████████▀   ████████\n████████   █████████\n████████   █████████\n████████   █████████\n████████   █████████\n █████████▄ ▀▀█████▀\n  ▀██████▀▀   ████▀ \n     ▀       ▄█▀    ";
  const font = 'Menlo, Consolas, "Liberation Mono", monospace';
  const markStyle = 'font:10px/12px ' + font + ';color:#C4AF79;background:#0b0c0f;';
  const labelStyle = 'font:600 11px/22px ' + font + ';color:#7f8792;';
  const valueStyle = 'font:500 15px/26px ' + font + ';color:inherit;';

  // One message per page load; no changes to the page or existing console output.
  // Font-relative padding keeps both columns aligned across monospace fonts.
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
