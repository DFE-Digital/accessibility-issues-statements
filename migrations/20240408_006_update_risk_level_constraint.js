exports.up = function(knex) {
  return knex.raw(`
    -- Find and drop all risk_level constraints
    DECLARE @SqlStatement NVARCHAR(MAX)

    SELECT @SqlStatement = 
      COALESCE(@SqlStatement + ' ', '') + 'ALTER TABLE issues DROP CONSTRAINT ' + QUOTENAME(con.name) + ';'
    FROM sys.check_constraints con
    INNER JOIN sys.objects t
      ON con.parent_object_id = t.object_id
    INNER JOIN sys.all_columns col
      ON con.parent_column_id = col.column_id
      AND con.parent_object_id = col.object_id
    WHERE t.name = 'issues'
      AND col.name = 'risk_level';

    IF @SqlStatement IS NOT NULL
      EXEC sp_executesql @SqlStatement;
    
    -- Add single constraint
    ALTER TABLE issues
    ADD CONSTRAINT issues_risk_level_check 
    CHECK (risk_level IN ('high', 'high_medium', 'medium', 'low'));
  `);
};

exports.down = function(knex) {
  return knex.raw(`
    -- Drop the new constraint
    ALTER TABLE issues
    DROP CONSTRAINT IF EXISTS issues_risk_level_check;
    
    -- Add back original constraint
    ALTER TABLE issues
    ADD CONSTRAINT issues_risk_level_check 
    CHECK (risk_level IN ('high', 'medium', 'low'));
  `);
}; 