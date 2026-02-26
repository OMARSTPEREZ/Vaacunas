
import struct

def get_image_info(file_path):
    with open(file_path, 'rb') as f:
        data = f.read(24)
        if data[:8] == b'\x89PNG\r\n\x1a\n':
            w, h = struct.unpack('>LL', data[16:24])
            return int(w), int(h)
    return None

file_path = r'c:\Users\PC-96724\Desktop\mi app vacunacion\apps\frontend\src\assets\logo_completo.png'
print(get_image_info(file_path))
