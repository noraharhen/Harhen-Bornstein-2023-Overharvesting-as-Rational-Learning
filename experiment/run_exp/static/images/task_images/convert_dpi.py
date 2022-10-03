import os
from glob import glob

all_images = glob("*.jpg")
all_images = all_images + glob("aliens/*.jpg")

begin_command = "convert -units PixelsPerInch "
dpi = 72

def change_dpi(file_name,new_dpi):
    full_command = begin_command + file_name + " -resample " + str(dpi) + " " + file_name
    print(full_command)
    os.system(full_command)
    return

for image in all_images:
    change_dpi(image,dpi)
