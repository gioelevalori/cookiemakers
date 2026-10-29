<?php
// Sends HTML emails with inline images, through an SMTP server (e.g. Gmail) or PHP mail().

class MailError extends Exception {}

class Mailer
{
    /** @param array $config ['transport' => 'smtp'|'mail', 'host', 'port', 'secure' => 'ssl'|'tls', 'user', 'pass', 'from'] */
    public function __construct(private array $config) {}

    /** @param array $message ['to', 'subject', 'html', 'text', 'attachments' => [['filename', 'dataUrl', 'cid']], 'replyTo'?] */
    public function send(array $message): void
    {
        [$headers, $body] = build_mime($this->config['from'], $message);
        if (($this->config['transport'] ?? 'smtp') === 'mail') {
            $sender = address_of($this->config['from']);
            $extra = implode("\r\n", array_filter($headers, fn ($line) => !preg_match('/^(To|Subject):/i', $line)));
            if (!mail($message['to'], encode_header($message['subject']), $body, $extra, "-f$sender")) {
                throw new MailError('Invio con mail() non riuscito.');
            }
            return;
        }
        smtp_send($this->config, address_of($this->config['from']), $message['to'], implode("\r\n", $headers) . "\r\n\r\n" . $body);
    }

    /** Opens and authenticates an SMTP session without sending anything. */
    public function verify(): void
    {
        $smtp = smtp_open($this->config);
        smtp_command($smtp, 'QUIT', [221]);
        fclose($smtp);
    }
}

function address_of(string $value): string
{
    return preg_match('/<([^>]+)>/', $value, $match) ? $match[1] : trim($value);
}

function encode_header(string $value): string
{
    return preg_match('/[^\x20-\x7e]/', $value) ? '=?UTF-8?B?' . base64_encode($value) . '?=' : $value;
}

function encode_address(string $value): string
{
    if (!preg_match('/^(.*)<([^>]+)>$/', trim($value), $match)) return trim($value);
    $name = trim($match[1], " \"");
    return ($name === '' ? '' : encode_header($name) . ' ') . '<' . $match[2] . '>';
}

/** Builds a multipart/related message: text and HTML alternatives plus inline images referenced by cid. */
function build_mime(string $from, array $message): array
{
    $related = 'rel-' . bin2hex(random_bytes(12));
    $alternative = 'alt-' . bin2hex(random_bytes(12));
    $headers = [
        'From: ' . encode_address($from),
        'To: ' . $message['to'],
        'Subject: ' . encode_header($message['subject']),
        'Date: ' . date(DATE_RFC2822),
        'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . substr(strrchr(address_of($from), '@'), 1) . '>',
        'MIME-Version: 1.0',
        "Content-Type: multipart/related; boundary=\"$related\"",
    ];
    if (!empty($message['replyTo'])) $headers[] = 'Reply-To: ' . $message['replyTo'];

    $part = fn (string $type, string $content) => "Content-Type: $type; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($content));
    $body = "--$related\r\nContent-Type: multipart/alternative; boundary=\"$alternative\"\r\n\r\n"
        . "--$alternative\r\n" . $part('text/plain', $message['text'])
        . "--$alternative\r\n" . $part('text/html', '<!doctype html><meta charset="utf-8">' . $message['html'])
        . "--$alternative--\r\n";
    foreach ($message['attachments'] ?? [] as $file) {
        [$meta, $data] = explode(',', $file['dataUrl'], 2);
        $type = substr($meta, 5, strpos($meta, ';') - 5);
        $body .= "--$related\r\nContent-Type: $type; name=\"{$file['filename']}\"\r\nContent-Transfer-Encoding: base64\r\n"
            . "Content-ID: <{$file['cid']}>\r\nContent-Disposition: inline; filename=\"{$file['filename']}\"\r\n\r\n"
            . chunk_split($data);
    }
    return [$headers, $body . "--$related--\r\n"];
}

function smtp_open(array $config)
{
    $secure = $config['secure'] ?? 'ssl';
    $context = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $smtp = @stream_socket_client(($secure === 'ssl' ? 'ssl://' : 'tcp://') . "{$config['host']}:{$config['port']}",
        $errno, $errstr, 20, STREAM_CLIENT_CONNECT, $context);
    if (!$smtp) throw new MailError("Server SMTP non raggiungibile ({$config['host']}:{$config['port']}): $errstr");
    stream_set_timeout($smtp, 30);
    smtp_command($smtp, null, [220]);
    $host = gethostname() ?: 'localhost';
    smtp_command($smtp, "EHLO $host", [250]);
    if ($secure === 'tls') {
        smtp_command($smtp, 'STARTTLS', [220]);
        if (!stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new MailError('STARTTLS non riuscito.');
        smtp_command($smtp, "EHLO $host", [250]);
    }
    if (!empty($config['user'])) {
        smtp_command($smtp, 'AUTH LOGIN', [334]);
        smtp_command($smtp, base64_encode($config['user']), [334]);
        smtp_command($smtp, base64_encode($config['pass']), [235], 'Accesso SMTP rifiutato: controlla utente e password per le app.');
    }
    return $smtp;
}

function smtp_send(array $config, string $sender, string $recipient, string $data): void
{
    $smtp = smtp_open($config);
    try {
        smtp_command($smtp, "MAIL FROM:<$sender>", [250]);
        smtp_command($smtp, "RCPT TO:<$recipient>", [250, 251]);
        smtp_command($smtp, 'DATA', [354]);
        // Dot-stuffing: a line starting with "." must be doubled inside DATA.
        smtp_command($smtp, preg_replace('/^\./m', '..', $data) . "\r\n.", [250]);
        smtp_command($smtp, 'QUIT', [221]);
    } finally {
        fclose($smtp);
    }
}

function smtp_command($smtp, ?string $command, array $expected, ?string $error = null): string
{
    if ($command !== null) fwrite($smtp, $command . "\r\n");
    $reply = '';
    while (($line = fgets($smtp, 515)) !== false) {
        $reply .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    $code = (int) substr($reply, 0, 3);
    if (!in_array($code, $expected, true)) throw new MailError($error ?? ('Errore SMTP: ' . trim($reply)));
    return $reply;
}
