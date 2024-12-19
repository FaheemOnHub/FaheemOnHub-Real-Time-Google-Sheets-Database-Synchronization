CREATE OR REPLACE FUNCTION notify_student_change() RETURNS TRIGGER AS $$
DECLARE 
    operation_type TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        operation_type := 'DELETE';
        PERFORM pg_notify('student_change', 'Deleted student ID: ' || OLD.id);
    ELSEIF (TG_OP = 'INSERT') THEN
        operation_type := 'INSERT';
        PERFORM pg_notify('student_change', 'Inserted student ID: ' || NEW.id);
    ELSEIF (TG_OP = 'UPDATE') THEN
        operation_type := 'UPDATE';
        PERFORM pg_notify('student_change', 'Updated student ID: ' || NEW.id);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


--Trigger
CREATE TRIGGER student_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW EXECUTE FUNCTION notify_student_change();
