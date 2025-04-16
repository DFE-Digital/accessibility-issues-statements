document.addEventListener('DOMContentLoaded', function () {
  const table = document.querySelector('.app-issues-table');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  const sortLinks = table.querySelectorAll('.app-sort-dropdown__link');

  // Get current sort parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const currentSort = urlParams.get('sort');
  const currentOrder = urlParams.get('order');

  // Sort table rows
  function sortTable(column, order) {
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
      let aValue, bValue;

      switch (column) {
        case 'title':
          aValue = a.querySelector('td:nth-child(1) a').textContent.trim();
          bValue = b.querySelector('td:nth-child(1) a').textContent.trim();
          break;
        case 'wcag_criterion':
          aValue = a.querySelector('td:nth-child(2)').textContent.trim();
          bValue = b.querySelector('td:nth-child(2)').textContent.trim();
          break;
        case 'wcag_level':
          aValue = a.querySelector('td:nth-child(3) .govuk-tag').textContent.trim();
          bValue = b.querySelector('td:nth-child(3) .govuk-tag').textContent.trim();
          // Custom sort order for WCAG levels
          const levelOrder = { 'A': 1, 'AA': 2, 'AAA': 3 };
          aValue = levelOrder[aValue] || 0;
          bValue = levelOrder[bValue] || 0;
          break;
        case 'created_at':
          aValue = new Date(a.querySelector('td:nth-child(4)').textContent.trim());
          bValue = new Date(b.querySelector('td:nth-child(4)').textContent.trim());
          break;
      }

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Clear and re-append sorted rows
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }
    rows.forEach(row => tbody.appendChild(row));

    // Update sort indicators
    sortLinks.forEach(link => {
      const linkSort = new URL(link.href).searchParams.get('sort');
      const linkOrder = new URL(link.href).searchParams.get('order');
      link.setAttribute('aria-current', linkSort === column && linkOrder === order);
    });
  }

  // Handle sort link clicks
  sortLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL(link.href);
      const sort = url.searchParams.get('sort');
      const order = url.searchParams.get('order');
      sortTable(sort, order);
    });
  });

  // Apply initial sort if specified in URL
  if (currentSort && currentOrder) {
    sortTable(currentSort, currentOrder);
  }
}); 