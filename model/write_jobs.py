import sys


def main():
    sub_num = int(sys.argv[1])

    with open("job_template.sh", "rt") as fin:
        with open("jobs/sub_" + str(sub_num)+".job", "wt") as fout:
            for line in fin:
                fout.write(line.replace('replace', str(sub_num)))
if __name__ == "__main__":
    main()
