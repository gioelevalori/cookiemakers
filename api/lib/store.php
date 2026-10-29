<?php
// Keeps each order (with its images) on disk between the Stripe session and the payment webhook.
// Stripe metadata is limited to short strings, so images cannot travel through Stripe.

class OrderStore
{
    public function __construct(private string $dir) {}

    private function file(string $id): string
    {
        if (!preg_match('/^[0-9a-f-]{36}$/', $id)) throw new InvalidArgumentException('Invalid order id');
        return $this->dir . '/' . $id . '.json';
    }

    public function save(string $id, array $order): void
    {
        if (!is_dir($this->dir) && !mkdir($this->dir, 0750, true) && !is_dir($this->dir)) {
            throw new RuntimeException('Cartella ordini non scrivibile.');
        }
        $target = $this->file($id);
        if (file_put_contents("$target.tmp", json_encode($order, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) === false
            || !rename("$target.tmp", $target)) {
            throw new RuntimeException('Impossibile salvare l\'ordine.');
        }
    }

    public function load(string $id): ?array
    {
        $file = $this->file($id);
        if (!is_file($file)) return null;
        $order = json_decode((string) file_get_contents($file), true);
        return is_array($order) ? $order : null;
    }

    /**
     * Runs $callback while holding an exclusive lock for the order, so webhooks
     * that Stripe delivers at the same time cannot send the same email twice.
     */
    public function withLock(string $id, callable $callback): mixed
    {
        if (!is_dir($this->dir)) mkdir($this->dir, 0750, true);
        $lock = fopen($this->file($id) . '.lock', 'c');
        if (!$lock) throw new RuntimeException('Impossibile bloccare l\'ordine.');
        try {
            flock($lock, LOCK_EX);
            return $callback();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** Deletes orders and locks older than $maxAgeSeconds: abandoned checkouts and orders already emailed. */
    public function prune(int $maxAgeSeconds, ?int $now = null): int
    {
        $now ??= time();
        $removed = 0;
        $files = array_merge(glob($this->dir . '/*.json') ?: [], glob($this->dir . '/*.lock') ?: []);
        foreach ($files as $file) {
            if ($now - filemtime($file) > $maxAgeSeconds && @unlink($file)) $removed++;
        }
        return $removed;
    }
}
