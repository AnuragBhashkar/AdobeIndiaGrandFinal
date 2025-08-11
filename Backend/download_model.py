from sentence_transformers import SentenceTransformer
import os

def download_and_save(model_name='all-MiniLM-L6-v2', save_dir='model'):
    print(f"Downloading model '{model_name}'...")
    os.makedirs(save_dir, exist_ok=True)
    model = SentenceTransformer(model_name)
    model.save(save_dir)
    print(f"Model saved to '{save_dir}'")

if __name__ == "__main__":
    download_and_save()
