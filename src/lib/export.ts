export interface SavedItem {
  id: number;
  korean: string;
  english: string;
}

export function exportToAnkiCSV(items: SavedItem[]) {
  if (items.length === 0) {
    alert("No saved items to export.");
    return;
  }
  
  // Create CSV format with proper escaping for quotes
  const csvContent = items.map(item => {
    const ko = item.korean.replace(/"/g, '""');
    const en = item.english.replace(/"/g, '""');
    return `"${ko}","${en}"`;
  }).join('\n');
  
  // Include BOM for Excel/Anki UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'translation_master_anki.csv');
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
