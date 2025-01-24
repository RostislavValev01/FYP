import dearpygui.dearpygui as dpg
import os
import google.generativeai as genai
import screeninfo  

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

def send_message(sender, app_data):
    # Get the user input
    user_input = dpg.get_value("input_box")
    
    # Display the user input in the chat area
    dpg.add_text(f"You: {user_input}", parent="chat_area", bullet=True)
    
    # Send the user input to the chatbot
    chat_session = model.start_chat(history=history)
    response = chat_session.send_message(user_input)
    
    # Get the chatbot's response
    bot_response = response.text
    
    # Display the bot's response in the chat area
    dpg.add_text(f"Bot: {bot_response}", parent="chat_area", bullet=True)
    
    # Update the history with the conversation
    history.append({"role": "user", "parts": [user_input]})
    history.append({"role": "model", "parts": [bot_response]})
    
    dpg.set_scroll_y("chat_area", 1.0)  
    
    
    dpg.set_value("input_box", "")

def close_app(sender, app_data):
    dpg.destroy_context()

dpg.create_context()

# Get the screen resolution dynamically
screen = screeninfo.get_monitors()[0]  # Gets the monitor resolution
screen_width = screen.width
screen_height = screen.height

window_height = screen_height - 40  # screen size of window

# Add font registry and load chosen font
with dpg.handler_registry():
    font_registry = dpg.add_font_registry()  # Create font registry
    custom_font = dpg.add_font("C:\\Windows\\Fonts\\Arial.ttf", 18, parent=font_registry)  # Add font to registry

# Create the main window with dynamic screen size
with dpg.handler_registry():
    dpg.add_key_press_handler(key=dpg.mvKey_Return, callback=send_message)

# Creates the main window
with dpg.handler_registry():
    with dpg.window(label="Chef Buddy Chatbot", width=screen_width, height=window_height, autosize=True):
        
        dpg.bind_font(custom_font)  # custom font
        
        # Creates chat history window
        with dpg.child_window(width=screen_width - 40, height=window_height - 250, border=True, tag="chat_area", autosize_y=True):
            # Display the initial greeting message (this will appear at the top of the chat history)
            dpg.add_text(f"Bot: Hi, I'm your personal chef! How can I help you?", parent="chat_area", bullet=True)

        
        with dpg.group(horizontal=True):  # Makes the label and prompt box in a horizontal orientation
            # Creates the label next to the prompt box
            dpg.add_text("Type your message:", tag="input_label", bullet=False)
            # Prompt box
            dpg.add_input_text(tag="input_box", width=screen_width - 250, height=100)

        # Send button
        dpg.add_button(label="Send", callback=send_message, width=150, height=60)

        # Close button 
        dpg.add_button(label="Close", callback=close_app, width=150, height=60)

# Sets up the resolution
dpg.create_viewport(title='Chef Buddy Chatbot', width=screen_width, height=window_height)
dpg.setup_dearpygui()
dpg.show_viewport()

# Runs the app
dpg.start_dearpygui()
dpg.destroy_context()
