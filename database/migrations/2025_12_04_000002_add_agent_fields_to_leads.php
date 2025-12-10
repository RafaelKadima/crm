<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            // Campos para qualificação e IA
            if (!Schema::hasColumn('leads', 'custom_fields')) {
                $table->json('custom_fields')->nullable()->after('last_interaction_source');
            }
            if (!Schema::hasColumn('leads', 'temperature')) {
                $table->string('temperature')->nullable()->after('custom_fields'); // hot, warm, cold
            }
            if (!Schema::hasColumn('leads', 'score')) {
                $table->integer('score')->nullable()->after('temperature'); // 0-100
            }
            
            // Campos para transferência para humano
            if (!Schema::hasColumn('leads', 'needs_human_attention')) {
                $table->boolean('needs_human_attention')->default(false)->after('score');
            }
            if (!Schema::hasColumn('leads', 'human_attention_reason')) {
                $table->string('human_attention_reason')->nullable()->after('needs_human_attention');
            }
            if (!Schema::hasColumn('leads', 'human_attention_priority')) {
                $table->string('human_attention_priority')->nullable()->after('human_attention_reason'); // low, medium, high
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $columns = ['custom_fields', 'temperature', 'score', 'needs_human_attention', 'human_attention_reason', 'human_attention_priority'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('leads', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

