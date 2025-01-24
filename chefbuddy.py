import tkinter as tk
from tkinter import scrolledtext
import os
import google.generativeai as genai

# API key integration
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    generation_config=generation_config,
    system_instruction="Precise outputs only related to cooking. This includes creating recipes, creating meals, step-by-step guidance on how to cook each meal, creating shopping lists, creating lists, tables, professional meal plans all related to cooking. You can also provide nutrition information for each food only if asked. Additionally, you can sometimes add some important health-related tips about the dish you've provided a recipe for. Also don't answer any questions not related to cooking as you're a chef-only chatbot.",
)

history = [{"role": "model", "parts": ["Hi, I'm your personal chef! How can I help you?"]}]

# Function to handle sending messages
def send_message():
    user_input = input_box.get("1.0", tk.END).strip()
    if not user_input:
        return

    # Display user input in chat area
    chat_area.config(state=tk.NORMAL)
    chat_area.insert(tk.END, f"You: {user_input}\n")

    # Send the user input to the chatbot
    chat_session = model.start_chat(history=history)
    response = chat_session.send_message(user_input)

    # Get the chatbot's response
    bot_response = response.text

    # Display bot response in chat area
    chat_area.insert(tk.END, f"Bot: {bot_response}\n")
    chat_area.config(state=tk.DISABLED)
    chat_area.see(tk.END)

    # Update history
    history.append({"role": "user", "parts": [user_input]})
    history.append({"role": "model", "parts": [bot_response]})

    # Clear input box
    input_box.delete("1.0", tk.END)

# Function to close the app
def close_app():
    root.destroy()

# Create the main Tkinter window
root = tk.Tk()
root.title("Chef Buddy Chatbot")
root.configure(bg="white")  # Set background to white

# Set window size dynamically based on screen size
screen_width = root.winfo_screenwidth()
screen_height = root.winfo_screenheight()
window_height = screen_height - 40
root.geometry(f"{screen_width}x{window_height}")

# Make the window resizable
root.grid_rowconfigure(0, weight=1)  # Make row 0 (chat area) resizable
root.grid_columnconfigure(0, weight=1)  # Make column 0 (chat area) resizable

# Chat area
chat_area = scrolledtext.ScrolledText(
    root,
    wrap=tk.WORD,
    state=tk.DISABLED,
    height=20,
    font=("Arial", 12),
    bg="white",
    fg="black",
    relief=tk.GROOVE,
    borderwidth=2,
)
chat_area.grid(row=0, column=0, padx=20, pady=20, sticky="nsew")

# Initial greeting
chat_area.config(state=tk.NORMAL)
chat_area.insert(tk.END, "Bot: Hi, I'm your personal chef! How can I help you?\n")
chat_area.config(state=tk.DISABLED)

# Input box
input_box = tk.Text(
    root,
    height=4,
    font=("Arial", 12),
    bg="white",
    fg="black",
    relief=tk.GROOVE,
    borderwidth=2,
)
input_box.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="ew")

# Button frame
button_frame = tk.Frame(root, bg="white")
button_frame.grid(row=2, column=0, pady=10, sticky="ew")

# Send button
send_button = tk.Button(
    button_frame,
    text="Send",
    command=send_message,
    width=10,
    font=("Arial", 12),
    bg="#0078D7",
    fg="white",
    relief=tk.RAISED,
    borderwidth=2,
)
send_button.pack(side=tk.LEFT, padx=10, expand=True)

# Close button
close_button = tk.Button(
    button_frame,
    text="Close",
    command=close_app,
    width=10,
    font=("Arial", 12),
    bg="#D9534F",
    fg="white",
    relief=tk.RAISED,
    borderwidth=2,
)
close_button.pack(side=tk.LEFT, padx=10, expand=True)

# Start the Tkinter main loop
root.mainloop()
