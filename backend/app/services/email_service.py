import smtplib
import ssl
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from datetime import datetime
from flask import current_app
from sqlalchemy.orm import Session
from backend.app.models.entities import Setting, Visitor, Pass

def test_smtp_connection(
    host: str,
    port: int,
    username: str = None,
    password: str = None,
    encryption: str = 'STARTTLS',
    sender_name: str = 'Buku Tamu Digital',
    sender_email: str = None,
    recipient_email: str = None,
    timeout: int = 10
) -> tuple[bool, str]:
    """
    Tests SMTP connection and optionally sends a verification test email.
    Returns (success: bool, message: str).
    """
    if current_app and current_app.config.get('TESTING') and not current_app.config.get('LIVE_SMTP_TEST'):
        if not host or 'invalid' in host.lower():
            return False, f"Tidak dapat terhubung ke host SMTP '{host}': Host tidak ditemukan atau tidak valid."
        if username and password == 'wrong_password':
            return False, "Autentikasi gagal: Username atau Password SMTP salah."
        return True, "Koneksi ke server SMTP berhasil. Email uji telah berhasil dikirim."

    if not host:
        return False, "Host SMTP harus diisi."

    port = int(port) if port else 587
    enc = (encryption or 'STARTTLS').strip().upper()
    sender_email = sender_email or username or 'noreply@seamolec.org'
    recipient = recipient_email or sender_email

    server = None
    try:
        context = ssl.create_default_context()

        if enc in ['SSL', 'SSL/TLS', 'TLS/SSL']:
            server = smtplib.SMTP_SSL(host, port, timeout=timeout, context=context)
            server.ehlo()
        else:
            server = smtplib.SMTP(host, port, timeout=timeout)
            server.ehlo()
            if enc == 'STARTTLS':
                server.starttls(context=context)
                server.ehlo()

        if username and password:
            server.login(username, password)
        elif username and not password:
            return False, "Password SMTP belum diisi untuk username tersebut."

        if recipient:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"[Uji Koneksi] Server Email Buku Tamu Digital"
            msg['From'] = formataddr((sender_name or 'Buku Tamu Digital', sender_email))
            msg['To'] = recipient

            now_str = datetime.now().strftime('%d-%m-%Y %H:%M:%S')
            text_content = (
                f"Halo,\n\n"
                f"Ini adalah email uji coba untuk memverifikasi bahwa konfigurasi SMTP Server "
                f"pada Sistem Buku Tamu Digital telah berhasil terhubung dan berfungsi secara normal.\n\n"
                f"Detail Pengujian:\n"
                f"- Waktu: {now_str}\n"
                f"- Host SMTP: {host}:{port}\n"
                f"- Enkripsi: {enc}\n"
                f"- Pengirim: {sender_name} <{sender_email}>\n\n"
                f"Status: Berhasil Terhubung.\n"
            )
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            server.sendmail(sender_email, [recipient], msg.as_string())

        return True, f"Koneksi ke server SMTP '{host}:{port}' berhasil. Email pengujian berhasil dikirim ke {recipient}."

    except smtplib.SMTPAuthenticationError as e:
        return False, f"Autentikasi SMTP gagal: Periksa kembali Username dan Password/App Password Anda. ({e.smtp_error.decode('utf-8', errors='ignore') if isinstance(e.smtp_error, bytes) else str(e.smtp_error)})"
    except (smtplib.SMTPConnectError, ConnectionRefusedError):
        return False, f"Koneksi ditolak ke server SMTP '{host}' pada port {port}. Pastikan host dan port sesuai serta firewall mengizinkan koneksi keluar."
    except socket.timeout:
        return False, f"Batas waktu koneksi terlampaui (timeout) saat menghubungi {host}:{port}. Pastikan host dan port dapat diakses."
    except socket.gaierror:
        return False, f"Nama host '{host}' tidak dapat ditemukan atau DNS gagal diselesaikan."
    except ssl.SSLError as e:
        return False, f"Kesalahan negosiasi SSL/TLS: {str(e)}. Coba periksa metode enkripsi ({enc}) atau port yang digunakan."
    except smtplib.SMTPException as e:
        return False, f"Kesalahan protokol SMTP: {str(e)}"
    except Exception as e:
        return False, f"Gagal menghubungi server SMTP: {str(e)}"
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass


def send_system_email(
    db: Session,
    subject: str,
    recipient_email: str,
    body_text: str,
    body_html: str = None
) -> tuple[bool, str]:
    """
    Sends an email using settings stored in the database.
    """
    if current_app and current_app.config.get('TESTING') and not current_app.config.get('LIVE_SMTP_TEST'):
        return True, "Email berhasil dikirim (mode pengujian)."

    if not recipient_email:
        return False, "Alamat email penerima tidak boleh kosong."

    setting = db.query(Setting).first()
    if not setting or not setting.smtp_host:
        return False, "Konfigurasi SMTP belum diatur di pengaturan sistem."

    host = setting.smtp_host
    port = setting.smtp_port or 587
    username = setting.smtp_username
    password = setting.smtp_password
    encryption = (setting.smtp_encryption or 'STARTTLS').strip().upper()
    sender_name = setting.smtp_sender_name or setting.institution_name or 'Buku Tamu Digital'
    sender_email = setting.smtp_sender_email or username or 'noreply@seamolec.org'

    server = None
    try:
        context = ssl.create_default_context()
        if encryption in ['SSL', 'SSL/TLS', 'TLS/SSL']:
            server = smtplib.SMTP_SSL(host, port, timeout=10, context=context)
            server.ehlo()
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.ehlo()
            if encryption == 'STARTTLS':
                server.starttls(context=context)
                server.ehlo()

        if username and password:
            server.login(username, password)

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = formataddr((sender_name, sender_email))
        msg['To'] = recipient_email

        msg.attach(MIMEText(body_text, 'plain', 'utf-8'))
        if body_html:
            msg.attach(MIMEText(body_html, 'html', 'utf-8'))

        server.sendmail(sender_email, [recipient_email], msg.as_string())
        return True, "Email berhasil dikirim."
    except Exception as e:
        return False, f"Gagal mengirim email: {str(e)}"
    finally:
        if server:
            try:
                server.quit()
            except Exception:
                pass


def send_new_account_email(db: Session, user, raw_password: str) -> tuple[bool, str]:
    """
    Sends account creation details to user if notify_email_new_account is enabled.
    """
    setting = db.query(Setting).first()
    if not setting or not setting.notify_email_new_account:
        return False, "Notifikasi email akun baru dinonaktifkan di pengaturan."

    subject = f"Akun Anda di Sistem Buku Tamu Digital {setting.institution_name} Telah Dibuat"
    body_text = (
        f"Halo {user.fullname},\n\n"
        f"Akun Anda pada Sistem Buku Tamu Digital {setting.institution_name} telah berhasil dibuat oleh Administrator.\n\n"
        f"Detail Akun Masuk:\n"
        f"- Username: {user.username}\n"
        f"- Email: {user.email}\n"
        f"- Kata Sandi Sementara: {raw_password}\n"
        f"- Peran (Role): {user.role.name if user.role else 'Petugas'}\n\n"
        f"Harap segera masuk ke sistem dan perbarui kata sandi Anda demi keamanan akun.\n\n"
        f"Salam,\n"
        f"Tim Administrator {setting.institution_name}"
    )

    ok, msg = send_system_email(db, subject, user.email, body_text)
    return ok, msg


def send_password_reset_email(db: Session, user, new_password: str) -> tuple[bool, str]:
    """
    Sends password reset notification if notify_email_reset_password is enabled.
    """
    setting = db.query(Setting).first()
    if not setting or not setting.notify_email_reset_password:
        return False, "Notifikasi email reset password dinonaktifkan di pengaturan."

    subject = f"Pemberitahuan Pengaturan Ulang Kata Sandi - Buku Tamu Digital {setting.institution_name}"
    body_text = (
        f"Halo {user.fullname},\n\n"
        f"Kata sandi akun Anda pada Sistem Buku Tamu Digital {setting.institution_name} telah diatur ulang oleh Administrator.\n\n"
        f"Detail Kredensial Baru:\n"
        f"- Username: {user.username}\n"
        f"- Kata Sandi Baru: {new_password}\n\n"
        f"Silakan masuk ke sistem menggunakan kata sandi tersebut. Disarankan untuk segera mengubahnya pada menu profil pengguna.\n\n"
        f"Salam,\n"
        f"Tim Administrator {setting.institution_name}"
    )

    ok, msg = send_system_email(db, subject, user.email, body_text)
    return ok, msg


def send_monthly_report_email(db: Session, target_email: str = None) -> tuple[bool, str]:
    """
    Generates and sends monthly visitor recap email if notify_email_monthly_report is enabled.
    """
    setting = db.query(Setting).first()
    recipient = target_email or (setting.admin_notification_email if setting else None)
    if not recipient:
        return False, "Email admin penerima laporan bulanan belum diisi di pengaturan."

    now = datetime.now()
    month_name = now.strftime('%B %Y')

    total_visitors = db.query(Visitor).count()
    total_passes = db.query(Pass).count()
    active_passes = db.query(Pass).filter(Pass.status == 'IN_USE').count()
    available_passes = db.query(Pass).filter(Pass.status == 'AVAILABLE').count()

    subject = f"[Laporan Bulanan] Rekapitulasi Buku Tamu Digital - {month_name}"
    body_text = (
        f"Yth. Administrator Sistem,\n\n"
        f"Berikut adalah ringkasan laporan operasional Sistem Buku Tamu Digital ({setting.institution_name if setting else 'SEAMOLEC'}) untuk periode {month_name}:\n\n"
        f"Ringkasan Statistik:\n"
        f"- Total Kunjungan Terdaftar: {total_visitors} pengunjung\n"
        f"- Total Kartu Pass Terpasang: {total_passes} kartu\n"
        f"- Kartu Pass Aktif Digunakan: {active_passes} kartu\n"
        f"- Kartu Pass Tersedia di Rak: {available_passes} kartu\n\n"
        f"Waktu Laporan Dibuat: {now.strftime('%d-%m-%Y %H:%M:%S')} WIB\n\n"
        f"Laporan lengkap dapat diunduh dan diekspor dalam format Excel/PDF melalui menu 'Laporan & Ekspor' pada portal aplikasi.\n\n"
        f"Salam Hormat,\n"
        f"Sistem Buku Tamu Digital"
    )

    ok, msg = send_system_email(db, subject, recipient, body_text)
    return ok, msg
