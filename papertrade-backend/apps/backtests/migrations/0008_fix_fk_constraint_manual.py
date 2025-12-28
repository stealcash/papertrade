from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('backtests', '0007_alter_backtestrun_strategy_predefined_and_more'),
    ]

    operations = [
        # Fix strategy_rule_based constraint
        migrations.RunSQL(
            sql="""
            ALTER TABLE backtest_runs 
            DROP CONSTRAINT IF EXISTS "backtest_runs_strategy_rule_based__b005778b_fk_strategie";
            
            ALTER TABLE backtest_runs 
            ADD CONSTRAINT "backtest_runs_strategy_rule_based__b005778b_fk_strategie" 
            FOREIGN KEY (strategy_rule_based_id) 
            REFERENCES strategies_rule_based(id) 
            ON DELETE CASCADE;
            """,
            reverse_sql="""
            ALTER TABLE backtest_runs 
            DROP CONSTRAINT IF EXISTS "backtest_runs_strategy_rule_based__b005778b_fk_strategie";
            
            ALTER TABLE backtest_runs 
            ADD CONSTRAINT "backtest_runs_strategy_rule_based__b005778b_fk_strategie" 
            FOREIGN KEY (strategy_rule_based_id) 
            REFERENCES strategies_rule_based(id) 
            ON DELETE SET NULL;
            """
        ),
        # Fix strategy_predefined constraint as well
        migrations.RunSQL(
            sql="""
            ALTER TABLE backtest_runs 
            DROP CONSTRAINT IF EXISTS "backtest_runs_strategy_predefined__33e477e5_fk_strategie";
            
            ALTER TABLE backtest_runs 
            ADD CONSTRAINT "backtest_runs_strategy_predefined__33e477e5_fk_strategie" 
            FOREIGN KEY (strategy_predefined_id) 
            REFERENCES strategies_master(id) 
            ON DELETE CASCADE;
            """,
            reverse_sql="""
            ALTER TABLE backtest_runs 
            DROP CONSTRAINT IF EXISTS "backtest_runs_strategy_predefined__33e477e5_fk_strategie";
            
            ALTER TABLE backtest_runs 
            ADD CONSTRAINT "backtest_runs_strategy_predefined__33e477e5_fk_strategie" 
            FOREIGN KEY (strategy_predefined_id) 
            REFERENCES strategies_master(id) 
            ON DELETE SET NULL;
            """
        ),
    ]
