## Fila para importação de leads

- A importação envia jobs para a fila `default`; sem worker ativo nada é processado.
- Ambiente de desenvolvimento: deixe um terminal rodando `php artisan queue:work --queue=default` (ou `--stop-when-empty` se quiser encerrar após processar tudo).
- Verifique o driver em `.env`: `QUEUE_CONNECTION=database` (ou o driver que estiver usando).
- Homolog/produção: mantenha um worker permanente via Supervisor/systemd ou use Laravel Horizon (`php artisan horizon`) gerenciado pelo supervisor.
- Se a fila não estiver rodando, o modal de importação ficará parado em 0% mesmo para poucos leads.

