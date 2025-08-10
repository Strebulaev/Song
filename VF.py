import os

def process_directory(directory, extensions, output_file):
    with open(output_file, 'w', encoding='utf-8') as out:
        for root, _, files in os.walk(directory):
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        out.write(f'--- Файл: {file_path} ---\n\n{content}\n\n')
                    except Exception as e:
                        out.write(f'--- Файл: {file_path} ---\n\nОшибка чтения файла: {str(e)}\n\n')

if __name__ == "__main__":
    directory = input("Введите путь к директории: ")
    extensions = input("Введите расширения файлов через пробел: ").split()
    output_file = input("Введите имя выходного файла: ")
    
    process_directory(directory, extensions, output_file)