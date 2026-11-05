
from database import test_connection

try:
    result = test_connection()
    print("Koneksi Aiven berhasil!")
    print("Database time:", result)
except Exception as error:
    print("Koneksi gagal:", error)
