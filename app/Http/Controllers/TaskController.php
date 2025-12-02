<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /**
     * Lista tarefas com filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Task::with(['lead.contact', 'contact', 'assignedUser']);

        if ($request->has('assigned_user_id')) {
            $query->where('assigned_user_id', $request->assigned_user_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->lead_id);
        }

        if ($request->has('today')) {
            $query->today();
        }

        if ($request->has('overdue')) {
            $query->overdue();
        }

        $query->orderBy('due_at');

        $tasks = $query->paginate($request->get('per_page', 15));

        return response()->json($tasks);
    }

    /**
     * Cria uma nova tarefa.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'nullable|uuid|exists:leads,id',
            'contact_id' => 'nullable|uuid|exists:contacts,id',
            'assigned_user_id' => 'required|uuid|exists:users,id',
            'type' => 'required|string|in:call,whatsapp,meeting,follow_up,other',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_at' => 'required|date',
        ]);

        $task = Task::create($validated);
        $task->load(['lead.contact', 'contact', 'assignedUser']);

        return response()->json([
            'message' => 'Tarefa criada com sucesso.',
            'task' => $task,
        ], 201);
    }

    /**
     * Exibe uma tarefa específica.
     */
    public function show(Task $task): JsonResponse
    {
        $task->load(['lead.contact', 'contact', 'assignedUser']);

        return response()->json($task);
    }

    /**
     * Atualiza uma tarefa.
     */
    public function update(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|string|in:call,whatsapp,meeting,follow_up,other',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'due_at' => 'nullable|date',
            'status' => 'nullable|string|in:pending,done,canceled',
            'assigned_user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $task->update($validated);
        $task->load(['lead.contact', 'contact', 'assignedUser']);

        return response()->json([
            'message' => 'Tarefa atualizada com sucesso.',
            'task' => $task,
        ]);
    }

    /**
     * Remove uma tarefa.
     */
    public function destroy(Task $task): JsonResponse
    {
        $task->delete();

        return response()->json([
            'message' => 'Tarefa removida com sucesso.',
        ]);
    }

    /**
     * Marca a tarefa como concluída.
     */
    public function complete(Task $task): JsonResponse
    {
        $task->complete();
        $task->load(['lead.contact', 'contact', 'assignedUser']);

        return response()->json([
            'message' => 'Tarefa concluída com sucesso.',
            'task' => $task,
        ]);
    }
}


