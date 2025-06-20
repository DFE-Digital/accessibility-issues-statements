;
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.DfEComponents = factory();
    }
}(this, function() {
    var DfEComponents = {};

    DfEComponents.nodeListForEach = function(nodes, callback) {
        if (window.NodeList.prototype.forEach) {
            return nodes.forEach(callback)
        }
        for (var i = 0; i < nodes.length; i++) {
            callback.call(window, nodes[i], i, nodes)
        }
    };

    DfEComponents.initAll = function(options) {
        // Set the options to an empty object by default if no options are passed.
        options = typeof options !== 'undefined' ? options : {};

        // Allow the user to initialise DfE Frontend in only certain sections of the page
        // Defaults to the entire document if nothing is set.
        var scope = typeof options.scope !== 'undefined' ? options.scope : document;

        var $sortableTables = scope.querySelectorAll('[data-module="dfe-sortable-table"]');
        DfEComponents.nodeListForEach($sortableTables, function($table) {
            new DfEComponents.SortableTable({
                table: $table
            });
        });

        var $sortableTables = scope.querySelectorAll('[data-module="dfe-sortable-table"]');
        DfEComponents.nodeListForEach($sortableTables, function($table) {
            new DfEComponents.SortableTable({
                table: $table
            });
        });
    }

    DfEComponents.SortableTable = function(params) {
        this.table = $(params.table);

        if (this.table.data('dfe-search-toggle-initialised')) {
            return
        }

        this.table.data('dfe-search-toggle-initialised', true);

        this.setupOptions(params);
        this.body = this.table.find('tbody');
        this.createHeadingButtons();
        this.createStatusBox();
        this.initialiseSortedColumn();
        this.table.on('click', 'th button', $.proxy(this, 'onSortButtonClick'));
    };

    DfEComponents.SortableTable.prototype.setupOptions = function(params) {
        params = params || {};
        this.statusMessage = params.statusMessage || 'Sort by %heading% (%direction%)';
        this.ascendingText = params.ascendingText || 'ascending';
        this.descendingText = params.descendingText || 'descending';
    };

    DfEComponents.SortableTable.prototype.createHeadingButtons = function() {
        var headings = this.table.find('thead th');
        var heading;
        for (var i = 0; i < headings.length; i++) {
            heading = $(headings[i]);
            if (heading.attr('aria-sort')) {
                this.createHeadingButton(heading, i);
            }
        }
    };

    DfEComponents.SortableTable.prototype.createHeadingButton = function(heading, i) {
        var text = heading.text();
        var button = $('<button type="button" data-index="' + i + '">' + text + '</button>');
        heading.text('');
        heading.append(button);
    };

    DfEComponents.SortableTable.prototype.createStatusBox = function() {
        this.status = $('<div aria-live="polite" role="status" aria-atomic="true" class="govuk-visually-hidden" />');
        this.table.parent().append(this.status);
    };

    DfEComponents.SortableTable.prototype.initialiseSortedColumn = function() {
        var rows = this.getTableRowsArray();

        this.table.find("th")
            .filter('[aria-sort="ascending"], [aria-sort="descending"]')
            .first()
            .each((index, el) => {
                var sortDirection = $(el).attr('aria-sort');
                var columnNumber = $(el).find('button').attr('data-index');
                var sortedRows = this.sort(rows, columnNumber, sortDirection);
                this.addRows(sortedRows);
            })
    };

    DfEComponents.SortableTable.prototype.onSortButtonClick = function(e) {
        var columnNumber = e.currentTarget.getAttribute('data-index');
        var sortDirection = $(e.currentTarget).parent().attr('aria-sort');
        var newSortDirection;
        if (sortDirection === 'none' || sortDirection === 'descending') {
            newSortDirection = 'ascending';
        } else {
            newSortDirection = 'descending';
        }
        var rows = this.getTableRowsArray();
        var sortedRows = this.sort(rows, columnNumber, newSortDirection);
        this.addRows(sortedRows);
        this.removeButtonStates();
        this.updateButtonState($(e.currentTarget), newSortDirection);
    };

    DfEComponents.SortableTable.prototype.updateButtonState = function(button, direction) {
        button.parent().attr('aria-sort', direction);
        var message = this.statusMessage;
        message = message.replace(/%heading%/, button.text());
        message = message.replace(/%direction%/, this[direction + 'Text']);
        this.status.text(message);
    };

    DfEComponents.SortableTable.prototype.removeButtonStates = function() {
        this.table.find('thead th').attr('aria-sort', 'none');
    };

    DfEComponents.SortableTable.prototype.addRows = function(rows) {
        for (var i = 0; i < rows.length; i++) {
            this.body.append(rows[i]);
        }
    };

    DfEComponents.SortableTable.prototype.getTableRowsArray = function() {
        var rows = [];
        var trs = this.body.find('tr');
        for (var i = 0; i < trs.length; i++) {
            rows.push(trs[i]);
        }
        return rows;
    };

    DfEComponents.SortableTable.prototype.sort = function(rows, columnNumber, sortDirection) {
        var newRows = rows.sort($.proxy(function(rowA, rowB) {
            var tdA = $(rowA).find('td,th').eq(columnNumber);
            var tdB = $(rowB).find('td,th').eq(columnNumber);
            var valueA = this.getCellValue(tdA);
            var valueB = this.getCellValue(tdB);
            if (sortDirection === 'ascending') {
                if (valueA < valueB) {
                    return -1;
                }
                if (valueA > valueB) {
                    return 1;
                }
                return 0;
            } else {
                if (valueB < valueA) {
                    return -1;
                }
                if (valueB > valueA) {
                    return 1;
                }
                return 0;
            }
        }, this));
        return newRows;
    };

    DfEComponents.SortableTable.prototype.getCellValue = function(cell) {
        var val = cell.attr('data-sort-value');
        val = val || cell.html();
        if ($.isNumeric(val)) {
            val = parseInt(val, 10);
        }
        return val;
    };

    return DfEComponents;
}));