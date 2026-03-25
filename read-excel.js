const XLSX = require('xlsx');
const path = 'C:/Users/Turtle/Desktop/HR Management System/data_entry/payroll_calculation/Payroll SMRU NOOK.xlsx';
const wb = XLSX.readFile(path);
console.log('Sheet names:', JSON.stringify(wb.SheetNames));
wb.SheetNames.forEach(function(name) {
  const ws = wb.Sheets[name];
  console.log('--- Sheet: ' + name + ' | Range: ' + (ws['!ref'] || 'empty'));
  if (ws['!merges']) console.log('  Merged cells: ' + ws['!merges'].length);
});
